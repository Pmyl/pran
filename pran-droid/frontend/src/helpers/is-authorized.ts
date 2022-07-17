export function authorize() {
  if (!!api_key_in_query_string()) {
    document.cookie = `api_secret_key=${api_key_in_query_string()}`;
    window.history.replaceState(null, '', window.location.href.split("?")[0]);
  } else if (!has_api_key_in_cookies()) {
    window.location.href = '/';
    return () => ``;
  }
}

function api_key_in_query_string(): string {
  return new URLSearchParams(window.location.search).get("api_secret_key");
}

function has_api_key_in_cookies(): boolean {
  return document.cookie.includes('api_secret_key=');
}