# Explicit configuration. Sourcing this file does not read secrets or use network.
mai_config <- function(values = NULL) {
  setting <- function(name, default = "") {
    if (is.null(values)) return(trimws(Sys.getenv(name, unset = default)))
    if (!name %in% names(values)) return(default)
    value <- values[[name]]
    if (is.null(value) || !length(value)) default else trimws(value)
  }
  environment <- toupper(setting("MAI_ENV", "DEV"))
  hosts <- c(DEV = "azapimdev.worldbank.org", QA = "azapimqa.worldbank.org",
             PROD = "azapim.worldbank.org")
  if (!environment %in% names(hosts)) stop("MAI_ENV must be DEV, QA, or PROD.", call. = FALSE)
  access <- setting("MAI_ACCESS_TYPE")
  if (!access %in% c("desktop", "posit-connect")) {
    stop("Set MAI_ACCESS_TYPE to desktop or posit-connect for this starter.", call. = FALSE)
  }
  team <- setting("MAI_TEAM_NAME")
  if (!nzchar(team) || grepl("[^ -~]", team)) {
    stop("Set MAI_TEAM_NAME to an approved ASCII header value.", call. = FALSE)
  }
  source_type <- setting("MAI_SOURCE_TYPE", "interactive")
  if (!source_type %in% c("interactive", "job")) stop("Invalid MAI_SOURCE_TYPE.", call. = FALSE)
  host <- unname(hosts[[environment]])
  url <- setting("MAI_RESPONSES_URL")
  allowed <- paste0("https://", host, c("/maifactory/openai/responses",
                                        "/conversationalai/maifactory/openai/responses"))
  if (nzchar(url) && !url %in% allowed) {
    stop("Use a verified Responses URL on the matching mAI host.", call. = FALSE)
  }
  list(environment = environment, access = access, team = team,
       source_type = source_type, host = host, responses_url = url,
       model = setting("MAI_MODEL"))
}

mai_token_provider <- function(config) {
  if (identical(config$access, "posit-connect")) {
    return(function() {
      tryCatch({
        api_key <- Sys.getenv("API_KEY")
        guid <- Sys.getenv("OAUTH_INTEGRATION_GUID")
        if (!nzchar(trimws(api_key)) || !nzchar(trimws(guid))) stop("Missing configuration")
        client <- connectapi::connect(server = "https://datanalytics-int.worldbank.org/",
                                      api_key = api_key)
        credentials <- connectapi::get_oauth_content_credentials(connect = client, audience = guid)
        token <- credentials$access_token
        if (!is.character(token) || length(token) != 1L || !nzchar(token)) stop("Missing token")
        token
      }, error = function(e) {
        stop("Connect OAuth failed. Check API_KEY, OAUTH_INTEGRATION_GUID, and content permissions locally.", call. = FALSE)
      })
    })
  }
  credential <- tryCatch({
    reticulate::import("itsai.platform.authentication")$DesktopToken()
  }, error = function(e) stop("Check the approved Python environment and private Desktop SDK.", call. = FALSE))
  function() {
    tryCatch(credential$get_token(env = paste0(config$environment, "_DESKTOP")),
             error = function(e) stop("Desktop login failed. Check approved access and network locally.", call. = FALSE))
  }
}

mai_perform <- function(config, token_provider, url, body = NULL) {
  allowed <- paste0("https://", config$host, c(
    "/conversationalai/platform/health/", "/maifactory/openai/responses",
    "/conversationalai/maifactory/openai/responses"
  ))
  if (!url %in% allowed) stop("Unapproved request URL.", call. = FALSE)
  response <- tryCatch({
    request <- httr2::request(url) |>
      httr2::req_auth_bearer_token(token_provider()) |>
      httr2::req_headers(`x-team-name` = config$team, `x-source-type` = config$source_type) |>
      httr2::req_timeout(30) |>
      httr2::req_options(followlocation = FALSE) |>
      httr2::req_error(is_error = function(response) FALSE)
    if (!is.null(body)) request <- httr2::req_body_json(request, body)
    httr2::req_perform(request)
  }, error = function(e) {
    stop("mAI request failed. Check network, auth, route, and status locally; no response body was logged.", call. = FALSE)
  })
  status <- httr2::resp_status(response)
  if (status != 200L) stop(sprintf("mAI request returned HTTP %d; no response body was logged.", status), call. = FALSE)
  tryCatch(httr2::resp_body_json(response, simplifyVector = FALSE),
           error = function(e) stop("mAI returned an unexpected response format.", call. = FALSE))
}

mai_health <- function(config, token_provider) {
  result <- mai_perform(config, token_provider,
                        paste0("https://", config$host, "/conversationalai/platform/health/"))
  if (!identical(result$status, "healthy")) stop("Gateway health was not confirmed.", call. = FALSE)
  invisible(TRUE)
}

mai_response_text <- function(result) {
  text <- character()
  for (item in result$output) {
    if (identical(item$type, "message")) {
      for (block in item$content) {
        if (identical(block$type, "output_text") && is.character(block$text)) {
          text <- c(text, block$text)
        }
      }
    }
  }
  if (!length(text)) stop("No Responses text blocks returned; check the verified schema and response status.", call. = FALSE)
  paste(text, collapse = "\n")
}

mai_ask <- function(config, token_provider, prompt) {
  if (!nzchar(config$responses_url) || !nzchar(config$model)) {
    stop("Verify and set MAI_RESPONSES_URL and MAI_MODEL before a model call.", call. = FALSE)
  }
  if (!is.character(prompt) || length(prompt) != 1L || is.na(prompt) || !nzchar(prompt)) {
    stop("Supply one nonempty prompt.", call. = FALSE)
  }
  result <- mai_perform(config, token_provider, config$responses_url,
                         list(model = config$model, input = prompt, max_output_tokens = 128L))
  mai_response_text(result)
}
