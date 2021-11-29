import nunjucks from "nunjucks";

export function renderObj(templatedObject: object, params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(templatedObject).map(([key, value]) => [
      key,
      typeof value == "string" ? renderString(value, params) : value,
    ])
  );
}

const templateEnv = new nunjucks.Environment(null, {autoescape: false, throwOnUndefined: true})
export function renderString(template: string, params: Record<string, unknown>) {
  try {
    return templateEnv.renderString(template, {
      ...params
    });
  } catch(error) {
    throw Error(JSON.stringify({template, params, error}))
  }
}
