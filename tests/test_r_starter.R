# Offline base-R tests; no packages, credential reads, login, or HTTP requests.
source("skills/mai-r/assets/mai_client.R")

expect_error <- function(expression, message = NULL) {
  error <- tryCatch({ force(expression); NULL }, error = identity)
  stopifnot(inherits(error, "error"))
  if (!is.null(message)) stopifnot(identical(conditionMessage(error), message))
}

# Resolve package calls only to supplied mocks, without loading any packages.
mock_client <- function(dependencies) {
  client <- new.env(parent = baseenv())
  client$`::` <- function(package, name) {
    dependency <- dependencies[[as.character(substitute(package))]][[as.character(substitute(name))]]
    if (!is.function(dependency)) stop("Unexpected package call.", call. = FALSE)
    dependency
  }
  sys.source("skills/mai-r/assets/mai_client.R", envir = client)
  client
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
rejected_requests <- 0L
blocked_client <- mock_client(list(httr2 = list(request = function(url) {
  rejected_requests <<- rejected_requests + 1L
  stop("Offline test reached the request boundary.", call. = FALSE)
})))
hosts <- c(DEV = "azapimdev.worldbank.org", QA = "azapimqa.worldbank.org",
           PROD = "azapim.worldbank.org")
for (environment in names(hosts)) {
  candidate <- values
  candidate$MAI_ENV <- environment
  candidate$MAI_RESPONSES_URL <- paste0("https://", hosts[[environment]], "/maifactory/openai/responses")
  matched <- mai_config(candidate)
  stopifnot(identical(matched$environment, environment),
            identical(matched$host, hosts[[environment]]),
            identical(matched$responses_url, candidate$MAI_RESPONSES_URL))
  called <- FALSE
  provider <- function() { called <<- TRUE; "test-token" }
  for (url in c(paste0("https://", hosts[[environment]],
                      "/conversationalai/maifactory/openai/responses"),
                paste0("https://", hosts[names(hosts) != environment], "/maifactory/openai/responses"))) {
    candidate$MAI_RESPONSES_URL <- url
    expect_error(mai_config(candidate), "Use a verified Responses URL on the matching mAI host.")
    expect_error(blocked_client$mai_perform(matched, provider, url), "Unapproved request URL.")
    stopifnot(!called, identical(rejected_requests, 0L))
  }
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
expect_error(blocked_client$mai_ask(config, provider, "public sample"))
stopifnot(!called, identical(rejected_requests, 0L))
expect_error(blocked_client$mai_perform(config, provider, "https://example.invalid/"), "Unapproved request URL.")
stopifnot(!called, identical(rejected_requests, 0L))
fixture <- list(output = list(list(type = "message", content = list(
  list(type = "output_text", text = "first"), list(type = "output_text", text = "second")
))))
stopifnot(identical(mai_response_text(fixture), "first\nsecond"))
stopifnot(identical(mai_response_text(list(output_text = "top-level", output = fixture$output)), "top-level"))
for (top in list(NULL, "", " \t\n", NA_character_, character(), c("one", "two"), 1L)) {
  fallback <- fixture
  fallback$output_text <- top
  stopifnot(identical(mai_response_text(fallback), "first\nsecond"))
}
ignored <- list(
  list(type = "reasoning", text = "private reasoning", content = list(list(type = "text", text = "ignore"))),
  list(type = "function_call", text = "private tool", content = list(list(type = "output_text", text = "ignore")))
)
mixed <- list(output = c(ignored, list(
  "malformed item",
  list(type = "output_text", text = "direct"),
  list(type = "text", text = "plain"),
  list(type = "message", content = list(
    "malformed block", list(type = "output_text", text = "first"),
    list(type = "text", text = "second"), list(type = "refusal", text = "ignore"),
    list(type = "text", text = ""), list(type = "text", text = NA_character_),
    list(type = "text", text = c("one", "two")), list(type = "text", text = 1L)
  )),
  list(type = "message", content = list(list(type = "output_text", text = "third")))
)))
stopifnot(identical(mai_response_text(mixed), "direct\nplain\nfirst\nsecond\nthird"))
for (empty in list(NULL, "invalid", list(), list(output_text = ""), list(output = list()),
                   list(output = ignored),
                   list(output = list(list(type = "text", text = " \t\n"))),
                   list(output = list(list(type = "message", content = list(list(type = "output_text", text = ""))))),
                   list(choices = list(list(message = list(content = "legacy")))))) {
  expect_error(mai_response_text(empty),
               "No Responses text blocks returned; check the verified schema and response status.")
}

# The Desktop SDK owns login; the starter passes DEV, QA, or PROD unchanged.
local({
  imports <- 0L
  credentials <- 0L
  token_envs <- character()
  fail_login <- FALSE
  client <- mock_client(list(reticulate = list(import = function(module) {
    stopifnot(identical(module, "itsai.platform.authentication"))
    imports <<- imports + 1L
    list(DesktopToken = function() {
      credentials <<- credentials + 1L
      list(get_token = function(env) {
        token_envs <<- c(token_envs, env)
        if (fail_login) stop("private SDK details")
        "test-token"
      })
    })
  })))
  for (environment in names(hosts)) {
    candidate <- values
    candidate$MAI_ENV <- environment
    candidate$MAI_ACCESS_TYPE <- "desktop"
    before <- length(token_envs)
    provider <- client$mai_token_provider(mai_config(candidate))
    stopifnot(identical(length(token_envs), before),
              identical(provider(), "test-token"), identical(provider(), "test-token"))
  }
  stopifnot(identical(imports, 3L), identical(credentials, 3L),
            identical(token_envs, rep(names(hosts), each = 2L)))
  fail_login <- TRUE
  expect_error(provider(), "Desktop login failed. Check approved access and network locally.")
  unavailable <- mock_client(list(reticulate = list(import = function(module) stop("private import details"))))
  expect_error(unavailable$mai_token_provider(mai_config(candidate)),
               "Check the approved Python environment and private Desktop SDK.")
})

# Connect credentials remain deferred and fresh on each provider call.
local({
  settings <- list(API_KEY = "mock-api-key", OAUTH_INTEGRATION_GUID = "mock-guid")
  connections <- list()
  audiences <- character()
  fail_oauth <- FALSE
  token <- "first-token"
  client <- mock_client(list(connectapi = list(
    connect = function(server, api_key) {
      stopifnot(identical(server, "https://datanalytics-int.worldbank.org/"))
      connections[[length(connections) + 1L]] <<- api_key
      "mock-connect"
    },
    get_oauth_content_credentials = function(connect, audience) {
      stopifnot(identical(connect, "mock-connect"))
      audiences <<- c(audiences, audience)
      if (fail_oauth) stop("private OAuth details")
      list(access_token = token)
    }
  )))
  client$Sys.getenv <- function(name) settings[[name]]
  provider <- client$mai_token_provider(mai_config(values))
  stopifnot(!length(connections), !length(audiences), identical(provider(), "first-token"))
  settings <- list(API_KEY = "next-api-key", OAUTH_INTEGRATION_GUID = "next-guid")
  token <- "next-token"
  stopifnot(identical(provider(), "next-token"),
            identical(connections, list("mock-api-key", "next-api-key")),
            identical(audiences, c("mock-guid", "next-guid")))
  oauth_error <- "Connect OAuth failed. Check API_KEY, OAUTH_INTEGRATION_GUID, and content permissions locally."
  fail_oauth <- TRUE
  expect_error(provider(), oauth_error)
  fail_oauth <- FALSE
  for (token in list(NULL, "", 1L, c("one", "two"))) expect_error(provider(), oauth_error)
  before <- length(connections)
  for (name in names(settings)) {
    original <- settings[[name]]
    settings[[name]] <- " \t"
    expect_error(provider(), oauth_error)
    settings[[name]] <- original
  }
  stopifnot(identical(length(connections), before))
})

# Exercise the real transport with package mocks, including both allowed routes.
local({
  calls <- list()
  count <- 0L
  status <- 200L
  fail_request <- FALSE
  fail_json <- FALSE
  client <- mock_client(list(httr2 = list(
    request = function(url) list(url = url),
    req_auth_bearer_token = function(request, token) { request$token <- token; request },
    req_headers = function(request, ...) { request$headers <- list(...); request },
    req_timeout = function(request, seconds) { request$timeout <- seconds; request },
    req_options = function(request, ...) { request$options <- list(...); request },
    req_error = function(request, is_error) { stopifnot(identical(is_error(NULL), FALSE)); request },
    req_body_json = function(request, body) { request$body <- body; request },
    req_perform = function(request) {
      calls[[length(calls) + 1L]] <<- request
      if (fail_request) stop("private request details")
      list(status = status, body = if (is.null(request$body)) list(status = "healthy") else fixture)
    },
    resp_status = function(response) response$status,
    resp_body_json = function(response, simplifyVector) {
      stopifnot(identical(simplifyVector, FALSE))
      if (fail_json) stop("private response body")
      response$body
    }
  )))
  provider <- function() { count <<- count + 1L; paste0("test-token-", count) }
  for (environment in names(hosts)) {
    candidate <- values
    candidate$MAI_ENV <- environment
    candidate$MAI_RESPONSES_URL <- paste0("https://", hosts[[environment]], "/maifactory/openai/responses")
    candidate$MAI_MODEL <- "approved-test-model"
    config <- mai_config(candidate)
    stopifnot(identical(client$mai_health(config, provider), TRUE),
              identical(client$mai_ask(config, provider, "public sample"), "first\nsecond"))
    health <- calls[[length(calls) - 1L]]
    response <- calls[[length(calls)]]
    stopifnot(identical(health$url, paste0("https://", config$host, "/conversationalai/platform/health/")),
              is.null(health$body), identical(response$url, config$responses_url),
              identical(response$body, list(model = "approved-test-model", input = "public sample", max_output_tokens = 128L)))
  }
  stopifnot(identical(count, 6L), identical(length(calls), 6L))
  for (i in seq_along(calls)) {
    stopifnot(identical(calls[[i]]$token, paste0("test-token-", i)),
              identical(calls[[i]]$headers, list(`x-team-name` = "test-team", `x-source-type` = "interactive")),
              identical(calls[[i]]$timeout, 30), identical(calls[[i]]$options$followlocation, FALSE))
  }
  request_error <- "mAI request failed. Check network, auth, route, and status locally; no response body was logged."
  fail_request <- TRUE
  expect_error(client$mai_perform(config, provider, config$responses_url), request_error)
  fail_request <- FALSE
  expect_error(client$mai_perform(config, function() stop("private token details"), config$responses_url), request_error)
  status <- 302L
  expect_error(client$mai_perform(config, provider, config$responses_url),
               "mAI request returned HTTP 302; no response body was logged.")
  status <- 200L
  fail_json <- TRUE
  expect_error(client$mai_perform(config, provider, config$responses_url), "mAI returned an unexpected response format.")
})
message("R starter offline tests passed.")
