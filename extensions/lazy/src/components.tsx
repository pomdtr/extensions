/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  ActionPanel,
  closeMainWindow,
  CopyToClipboardAction,
  Detail,
  Form,
  Icon,
  ImageLike,
  List,
  OpenWithAction,
  PushAction,
  showHUD,
  showToast,
  SubmitFormAction,
  ToastStyle,
  useNavigation
} from "@raycast/api";
import { execaCommand, execaCommandSync } from "execa";
import { homedir } from "os";
import { resolve } from "path";
import { useEffect, useState } from "react";
import { GetStep } from "./io";
import { Lazy } from "./lazy";
import { renderObj, renderString } from "./template";

export function RootCommands(props: { roots: Lazy.Roots; configDir: string }): JSX.Element {
  return (
    <List>
      {Object.entries(props.roots).map(([packageName, root]) => (
        <List.Section key={packageName} title={packageName}>
          {root.items.map((item) => (
            <StaticItem
              item={item}
              key={item.title}
              packageName={packageName}
              icon={root.icon ? { source: root.icon } : Icon.Terminal}
              additionalAction={
                <OpenWithAction
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                  key={packageName}
                  path={resolve(props.configDir, `${packageName}.yaml`)}
                />
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function PreviewStep(props: { step: Lazy.Preview }) {
  const step = props.step;
  const codeblock = (text: string) => "```\n" + text + "\n```";
  const command = typeof step.command == "string" ? { command: step.command } : step.command;
  const [text, setText] = useState<string>();
  useEffect(() => {
    execCommand(renderString(command.command, { params: step.params }), command.shell).then((res) =>
      setText(res.stdout)
    );
  }, [step.params]);

  return (
    <Detail
      navigationTitle={step.title}
      markdown={text ? codeblock(text) : undefined}
      isLoading={typeof text === "undefined"}
      actions={
        <ActionPanel>
          {step.actions?.map((action, index) => {
            if (action.type == "step")
              return (
                <StepAction
                  stepReference={{ ...action, params: renderObj(action.params || {}, { params: step.params }) }}
                  packageName={step.packageName!}
                  key={index}
                />
              );
            return (
              <CommandAction
                key={action.title || action.command}
                action={{ ...action, command: renderString(action.command, { paramsparams: step.params }) }}
              />
            );
          })}
          {text ? <CopyToClipboardAction content={text} /> : null}
        </ActionPanel>
      }
    />
  );
}

function FormStep(props: { step: Lazy.Form }) {
  const { step } = props;
  const action = step.onSubmit;
  const navigation = useNavigation();

  function FormAction(props: { action: Lazy.Action }) {
    const action = props.action
    if (action.type == "step") {
      const next = GetStep(action, step.packageName!);
      return (
        <SubmitFormAction
          title={action.alias || next.title}
          onSubmit={(values: Record<string, unknown>) => {
            const next = GetStep(action, step.packageName!);
            const refParams = renderObj(action.params || {}, { form: values, params: step.params });
            navigation.push(<Step step={{ ...next, params: { ...next.params, ...refParams } }} />);
          }}
        />
      );
    }
    return (
      <SubmitFormAction
        title={action.title}
        icon={Icon.Checkmark}
        onSubmit={(formValues: Record<string, unknown>) =>
          runCommand({
            ...step.onSubmit,
            command: renderString(action.command, { params: { ...step.params, ...formValues } }),
          })
        }
      />
    );
  }

  function FormField(props: { field: Lazy.Field }) {
    const field = props.field;
    switch (field.type) {
      case "checkbox":
        return <Form.Checkbox id={field.dest} label={field.title} defaultValue={field.default} />;
      case "dropdown":
        return (
          <Form.Dropdown id={field.dest} defaultValue={field.default} title={field.title}>
            {field.items.map((item) => (
              <Form.Dropdown.Item title={item} value={item} key={item} />
            ))}
          </Form.Dropdown>
        );
      case "textfield":
        return <Form.TextField id={field.dest} value={field.default} title={field.title} />;
      case "textarea":
        return <Form.TextArea id={field.dest} value={field.default} title={field.title} />;
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <FormAction action={action} />
        </ActionPanel>
      }
    >
      {step.fields.map((field) => (
        <FormField key={field.dest} field={field} />
      ))}
    </Form>
  );
}

function StaticStep(props: { step: Lazy.StaticList }) {
  const { step } = props;
  return (
    <List navigationTitle={step.title}>
      {step.items.map((item) => (
        <StaticItem item={item} packageName={step.packageName!} params={step.params} />
      ))}
    </List>
  );
}

export function StaticItem(props: {
  item: Lazy.StaticItem;
  packageName: string;
  icon?: ImageLike;
  params?: Lazy.StepParams;
  additionalAction?: JSX.Element;
}) {
  const { item, packageName, params = {}, icon = Icon.Dot, additionalAction: action } = props;
  return (
    <List.Item
      title={item.title}
      subtitle={item.subtitle}
      accessoryTitle={item.accessoryTitle}
      icon={icon}
      key={item.title}
      actions={
        <ActionPanel>
          {item.actions?.map((action, index) => {
            if (action.type == "step") {
              const refEnv = renderObj({ ...action.params }, params);
              return (
                <StepAction
                  stepReference={{
                    ...action,
                    params: refEnv,
                  }}
                  packageName={packageName!}
                  key={index}
                />
              );
            }

            return (
              <CommandAction
                key={action.title || action.command}
                action={{ ...action, command: renderString(action.command, { params }) }}
              />
            );
          })}
          {action}
        </ActionPanel>
      }
    />
  );
}

function QueryStep(props: { step: Lazy.QueryList }) {
  const step = props.step;
  const [query, setQuery] = useState<string>("");
  const generator =
    typeof step.items.generator == "string"
      ? renderString(step.items.generator, { QUERY: query })
      : renderString(step.items.generator.command, { QUERY: query });

  return (
    <ListStep
      step={{
        ...step,
        type: "filter",
        items: { ...step.items, generator },
      }}
      onSearchTextChange={setQuery}
    />
  );
}

function ListStep(props: { step: Lazy.FilterList; onSearchTextChange?: (query: string) => void }) {
  const { step, onSearchTextChange } = props;
  const generator = typeof step.items.generator == "string" ? { command: step.items.generator } : step.items.generator;
  const [state, setState] = useState<{ lines: string[]; isLoading: boolean }>({ lines: [], isLoading: true });
  let shouldUpdate = true;

  const lineToJson = (line: string) => {
    try {
      return JSON.parse(line);
    } catch (e) {
      return {};
    }
  };

  const fetchLines = () => {
    setState({ ...state, isLoading: true });
    return execCommand(renderString(generator.command, { params: step.params }), generator.shell)
      .then((res) => res.stdout.split("\n"))
      .then((lines) => lines.filter((line) => line));
  };

  useEffect(() => {
    fetchLines().then((lines) => {
      if (shouldUpdate) setState({ lines: lines, isLoading: false });
    });
    return () => {
      shouldUpdate = false;
    };
  }, [generator.command]);

  return (
    <List navigationTitle={step.title} isLoading={state.isLoading} onSearchTextChange={onSearchTextChange}>
      {state.lines.map((line, index) => {
        const words = line.split(step.items.delimiter || /\s+/);
        const lineEnv = { params: step.params, words, json: lineToJson(line), line };
        return (
          <List.Item
            icon={Icon.Dot}
            key={index}
            title={step.items.title ? renderString(step.items.title, lineEnv) : line}
            subtitle={step.items.subtitle ? renderString(step.items.subtitle, lineEnv) : undefined}
            accessoryTitle={step.items.accessoryTitle ? renderString(step.items.accessoryTitle, lineEnv) : undefined}
            actions={
              <ActionPanel>
                {step.items.actions?.map((action, index) => {
                  if (action.match && !new RegExp(action.match).test(line)) return null;
                  if (action.type == "step")
                    return (
                      <StepAction
                        stepReference={{ ...action, params: renderObj({ ...action.params }, lineEnv) }}
                        packageName={step.packageName!}
                        key={index}
                      />
                    );
                  return (
                    <CommandAction key={index} action={{ ...action, command: renderString(action.command, lineEnv) }} />
                  );
                })}
                <ActionPanel.Item
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={() => {
                    fetchLines().then((lines) => {
                      if (shouldUpdate) setState({ lines: lines, isLoading: false });
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}

function ConditionalStep(props: { step: Lazy.Conditional }) {
  const step = props.step;
  try {
    execaCommandSync(step.condition);
    const next = GetStep(step.success, step.packageName!);
    return <Step step={next} />;
  } catch (e) {
    const next = GetStep(step.failure, step.packageName!);
    return <Step step={next} />;
  }
}

function StepAction(props: { stepReference: Lazy.StepAction; packageName: string }) {
  const { stepReference, packageName } = props;
  const next = GetStep(stepReference, packageName);
  const step = {
    ...next,
    title: stepReference.alias || next.title,
    params: { ...next.params, ...stepReference.params },
  };

  return <PushAction icon={Icon.ArrowRight} title={stepReference.alias || step.title} target={<Step step={step} />} />;
}

function Step(props: { step: Lazy.Step }) {
  const step = props.step;

  switch (step.type) {
    case "filter":
      return <ListStep step={step} />;
    case "query":
      return <QueryStep step={step} />;
    case "static":
      return <StaticStep step={step} />;
    case "preview":
      return <PreviewStep step={step} />;
    case "form":
      return <FormStep step={step} />;
    case "if":
      return <ConditionalStep step={step} />;
  }
}

async function runCommand(command: Lazy.Command) {
  console.debug(command);
  const { stdout } = await execCommand(command.command, command.shell);
  if (stdout) await showHUD(stdout);
  else closeMainWindow();
}

export function execCommand(command: string, shell = "/bin/bash") {
  console.debug(command);
  return execaCommand(command, { cwd: homedir(), shell: shell }).catch((error) => {
    console.error(error.message);
    showToast(ToastStyle.Failure, "An error occurred!", error.message);
    throw error;
  });
}

function CommandAction(props: { action: Lazy.CommandAction; refresh?: () => void }) {
  const action = props.action;
  if (action.confirm)
    return (
      <PushAction
        title={action.title || action.command}
        icon={Icon.Hammer}
        target={
          <ConfirmAction
            markdown={`> ⚠️ You're about to run the command **${action.command}**.  \n> Confirm?`}
            onConfirm={() => runCommand(action)}
          />
        }
      />
    );
  return (
    <ActionPanel.Item title={action.title || action.command} icon={Icon.Hammer} onAction={() => runCommand(action)} />
  );
}

export function ConfirmAction(props: { onConfirm: () => void; markdown: string }) {
  const navigation = useNavigation();
  return (
    <Detail
      markdown={props.markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Item title="No" onAction={() => navigation.pop()} />
          <ActionPanel.Item
            title="Yes"
            onAction={() => {
              props.onConfirm();
            }}
          />
        </ActionPanel>
      }
    />
  );
}
