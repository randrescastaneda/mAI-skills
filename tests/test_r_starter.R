# Offline base-R tests; no packages, credential reads, login, or HTTP requests.
source("skills/mai-r/assets/mai_client.R")

expect_error <- function(expression) {
  failed <- tryCatch({ force(expression); FALSE }, error = function(e) TRUE)
  stopifnot(failed)
}
values <- list(MAI_ENV = "DEV", MAI_ACCESS_TYPE = "posit-connect", MAI_TEAM_NAME = "test-team")
config <- mai_config(values)
stopifnot(identical(config$host, "azapimdev.worldbank.org"), identical(config$responses_url, ""))
stopifnot(identical(mai_config(unlist(values))$host, config$host))
local({
  old <- Sys.getenv(c("MAI_ENV", "MAI_ACCESS_TYPE", "MAI_TEAM_NAME"), unset = NA_character_)
  on.exit({
    for (name in names(old)) {
      if (is.na(old[[name]])) Sys.unsetenv(name) else do.call(Sys.setenv, setNames(list(old[[name]]), name))
    }
  })
  Sys.setenv(MAI_ENV = "DEV", MAI_ACCESS_TYPE = "posit-connect", MAI_TEAM_NAME = "test-team")
  stopifnot(identical(mai_config()$host, config$host))
})
for (environment in c("DEV", "QA", "PROD")) {
  candidate <- values
  candidate$MAI_ENV <- environment
  stopifnot(identical(mai_config(candidate)$environment, environment))
}
for (field in c("MAI_ENV", "MAI_ACCESS_TYPE", "MAI_TEAM_NAME", "MAI_SOURCE_TYPE")) {
  candidate <- values
  candidate[[field]] <- "invalid\r\nheader"
  expect_error(mai_config(candidate))
}
for (url in c("https://api.openai.com/v1/responses",
              "https://azapimqa.worldbank.org/maifactory/openai/responses",
              "https://azapimdev.worldbank.org/maifactory/openai/responses?key=test",
              "https://user:test@azapimdev.worldbank.org/maifactory/openai/responses")) {
  candidate <- values
  candidate$MAI_RESPONSES_URL <- url
  expect_error(mai_config(candidate))
}
called <- FALSE
provider <- function() { called <<- TRUE; "test-token" }
expect_error(mai_ask(config, provider, "public sample"))
stopifnot(!called)
expect_error(mai_perform(config, provider, "https://example.invalid/"))
stopifnot(!called)
fixture <- list(output = list(list(type = "message", content = list(
  list(type = "output_text", text = "first"), list(type = "output_text", text = "second")
))))
stopifnot(identical(mai_response_text(fixture), "first\nsecond"))
expect_error(mai_response_text(list(choices = list(list(message = list(content = "legacy"))))))

# Replace the network boundary with a mock; check payload and provider freshness.
original_perform <- mai_perform
calls <- list()
count <- 0L
provider <- function() { count <<- count + 1L; "test-token" }
mai_perform <- function(config, token_provider, url, body = NULL) {
  token_provider()
  calls[[length(calls) + 1L]] <<- list(url = url, body = body)
  if (is.null(body)) list(status = "healthy") else fixture
}
candidate <- values
candidate$MAI_RESPONSES_URL <- "https://azapimdev.worldbank.org/maifactory/openai/responses"
candidate$MAI_MODEL <- "approved-test-model"
config <- mai_config(candidate)
mai_health(config, provider)
stopifnot(identical(mai_ask(config, provider, "public sample"), "first\nsecond"))
stopifnot(identical(count, 2L), identical(calls[[2L]]$body$max_output_tokens, 128L),
          identical(calls[[2L]]$body$model, "approved-test-model"))
mai_perform <- original_perform
message("R starter offline tests passed.")
