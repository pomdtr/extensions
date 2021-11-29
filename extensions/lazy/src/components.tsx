/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  ActionPanel,
  closeMainWindow,
  CopyToClipboardAction,
  Detail,
  Form,
  Icon,
  ImageLike,
  KeyEquivalent,
  List,
  PushAction,
  showHUD,
  showToast,
  SubmitFormAction,
  ToastStyle,
  useNavigation
} from "@raycast/api";
import { execaCommand } from "execa";
import { homedir } from "os";
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
              keywords={[packageName]}
              // additionalAction={
              //   <OpenWithAction
              //     shortcut={{ modifiers: ["cmd"], key: "o" }}
              //     key={packageName}
              //     path={resolve(props.configDir, `${packageName}.yaml`)}
              //   />
              // }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function PreviewStep(props: { step: Lazy.Preview }) {
  const step = props.step;
  const { params, prefs } = step;
  const codeblock = (text: string) => "```\n" + text + "\n```";
  const [text, setText] = useState<string>();
  useEffect(() => {
    if (typeof step.content == "string") {
      setText(renderString(step.content, { params, prefs }));
    } else {
      const { command, shell } = step.content;
      execCommand(renderString(command, { params, prefs }), shell).then((res) =>
        setText(step.markdown ? res.stdout : codeblock(res.stdout))
      );
    }
  }, [step.params]);

  return (
    <Detail
      navigationTitle={step.title}
      markdown={text}
      isLoading={typeof text === "undefined"}
      actions={
        <ActionPanel>
          {step.actions?.map((action, index) => {
            if (action.type == "step")
              return (
                <StepAction
                  stepAction={{ ...action, params: renderObj(action.params || {}, { params, prefs }) }}
                  packageName={step.packageName}
                  key={index}
                />
              );
            return (
              <CommandAction
                key={action.title || action.command}
                action={{ ...action, command: renderString(action.command, { params, prefs }) }}
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
  const { params, prefs } = step;
  const action = step.action;
  const navigation = useNavigation();

  function FormAction(props: { action: Lazy.Action }) {
    const action = props.action;
    if (action.type == "step") {
      const next = GetStep(action, step.packageName!);
      return (
        <SubmitFormAction
          title={action.alias || next.title}
          onSubmit={(values: Record<string, unknown>) => {
            const next = GetStep(action, step.packageName!);
            const refParams = renderObj(action.params || {}, { form: values, params, prefs });
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
            ...step.action,
            command: renderString(action.command, { params, form: formValues, prefs }),
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
        <StaticItem item={item} packageName={step.packageName!} env={step.params} />
      ))}
    </List>
  );
}

export function StaticItem(props: {
  item: Lazy.StaticItem;
  packageName: string;
  icon?: ImageLike;
  keywords?: string[];
  env?: Lazy.StepEnv;
}) {
  const { item, packageName, keywords, env = {}, icon = Icon.Dot } = props;
  return (
    <List.Item
      title={item.title}
      subtitle={item.subtitle}
      icon={icon}
      keywords={keywords}
      key={item.title}
      actions={
        <ActionPanel>
          {item.actions?.map((action, index) => {
            if (action.type == "step") {
              const refEnv = renderObj({ ...action.params }, env);
              return (
                <StepAction
                  stepAction={{
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
                action={{ ...action, command: renderString(action.command, env) }}
              />
            );
          })}
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
  const { prefs, params } = props.step;
  const generator = typeof step.items.generator == "string" ? { command: step.items.generator } : step.items.generator;
  const [state, setState] = useState<{ lines: string[]; isLoading: boolean }>({ lines: [], isLoading: true });
  let shouldUpdate = true;

  const lineToJson = (line: string) => {
    try {
      return JSON.parse(line);
    } catch (e) {
      return null;
    }
  };

  const fetchLines = () => {
    setState({ ...state, isLoading: true });
    return execCommand(renderString(generator.command, { params, prefs }), generator.shell)
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
        const lineEnv = { params, prefs, words, json: lineToJson(line), line };
        return (
          <List.Item
            icon={Icon.Dot}
            key={index}
            title={step.items.title ? renderString(step.items.title, lineEnv) : line}
            subtitle={step.items.subtitle ? renderString(step.items.subtitle, lineEnv) : undefined}
            actions={
              <ActionPanel>
                {step.items.actions?.map((action, index) => {
                  if (action.condition && renderString(action.condition, lineEnv) == "false") return null;
                  if (action.type == "step")
                    return (
                      <StepAction
                        stepAction={{ ...action, params: renderObj({ ...action.params }, lineEnv) }}
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

function StepAction(props: { stepAction: Lazy.StepAction; packageName: string }) {
  const { stepAction, packageName } = props;
  const next = GetStep(stepAction, packageName);
  const step = {
    ...next,
    title: stepAction.alias || next.title,
    params: { ...next.params, ...stepAction.params },
  };

  return (
    <PushAction
      icon={Icon.ArrowRight}
      shortcut={stepAction.shortcut ? { modifiers: ["ctrl"], key: stepAction.shortcut as KeyEquivalent } : undefined}
      title={stepAction.alias || step.title}
      target={<Step step={step} />}
    />
  );
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
  }
}

async function runCommand(command: Lazy.Command) {
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
        shortcut={action.shortcut ? { modifiers: ["ctrl"], key: action.shortcut as KeyEquivalent } : undefined}
        target={
          <ConfirmAction
            markdown={`> ⚠️ You're about to run the command **${action.command}**.  \n> Confirm?`}
            onConfirm={() => runCommand(action)}
          />
        }
      />
    );
  return (
    <ActionPanel.Item
      title={action.title || action.command}
      icon={Icon.Hammer}
      shortcut={action.shortcut ? { modifiers: ["ctrl"], key: action.shortcut as KeyEquivalent } : undefined}
      onAction={() => runCommand(action)}
    />
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
