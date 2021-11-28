import nunjucks from "nunjucks";

export function renderObj(templatedObject: object, env?: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(templatedObject).map(([key, value]) => [
      key,
      typeof value == "string" ? renderString(value, env) : value,
    ])
  );
}

const templateEnv = new nunjucks.Environment(null, {autoescape: false})

export function renderString(template: string, env?: Record<string, unknown>) {
  return templateEnv.renderString(template, {
    ...env
  });
}
