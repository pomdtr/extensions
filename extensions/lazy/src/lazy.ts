/* eslint-disable @typescript-eslint/no-namespace */
export namespace Lazy {
  export interface Config {
    schemaVersion?: "v1";
    requirements?: string[];
    aliases?: unknown[];
    icon?: string;
    params?: StepParams;
    steps: {
      [step_id: string]: Step;
    };
    roots?: StaticItem[];
  }

  export interface BaseStep {
    type: "if" | "query" | "filter" | "static" | "form" | "preview";
    title: string;
    packageName?: string;
    params?: StepParams;
  }

  export interface Conditional extends BaseStep {
    type: "if";
    condition: string;
    success: StepAction;
    failure: StepAction;
  }

  export interface DynamicList extends BaseStep {
    items: DynamicItems;
  }

  export interface QueryList extends DynamicList {
    type: "query";
  }

  export interface FilterList extends DynamicList {
    type: "filter";
  }

  export interface StaticList extends BaseStep {
    type: "static"
    items: StaticItem[];
  }

  export interface Item {
    title?: string;
    subtitle?: string;
    accessoryTitle?: string;
  }

  export interface DynamicItems extends Item {
    delimiter?: string;
    generator: string | Command;
    actions?: Action[];
  }

  export interface StaticItem extends Item {
    title: string;
    actions?: Action[];
  }

  export interface Preview extends BaseStep {
    type: "preview";
    shell?: string;
    command: string | Command;
    markdown?: boolean;
    actions?: Action[];
  }

  export type Step = StaticList | FilterList | QueryList | Preview | Form | Conditional;

  export interface Command {
    command: string;
    skip_lines?: number;
    shell?: string;
  }

  export interface CommandAction extends Command {
    type: "command"
    title: string;
    confirm?: boolean;
    match?: string;
  }

  export interface StepAction {
    type: "step"
    alias?: string;
    packageName?: string;
    match?: string;
    target: string;
    params?: StepParams;
  }

  export type Action = CommandAction | StepAction

  export interface Packages {
    [packageName: string]: { [stepId: string]: Step & {packageName: string, params: Lazy.StepParams} };
  }

  export interface StepParams {
    [key: string]: unknown;
  }

  export interface Form extends BaseStep {
    fields: Field[];
    type: "form";

    onSubmit: Action;
  }

  export interface BaseField {
    type: "checkbox" | "dropdown" | "textfield" | "textarea";
    dest: string;
    title: string;
    default?: unknown;
  }

  export interface CheckBox extends BaseField {
    type: "checkbox";
    default?: boolean;
  }

  export interface DropDown extends BaseField {
    items: string[];
    type: "dropdown";
    default?: string;
  }

  export interface TextField extends BaseField {
    type: "textfield";
    default?: string;
  }

  export interface TextArea extends BaseField {
    type: "textarea";
    default?: string;
  }

  export type Field = CheckBox | DropDown | TextField | TextArea;

export interface Roots {
  [packageName: string]: {
    items: Lazy.StaticItem[];
    icon?: string;
    requirements?: string[];
  };
}
}
