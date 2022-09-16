import { ActionPanel, Color, Icon, List, showToast, Action, Image, LocalStorage, Toast, Detail } from "@raycast/api";
import { Feed, getFeeds } from "./feeds";
import AddFeedForm from "./subscription-form";
import Parser from "rss-parser";
import TimeAgo from "javascript-time-ago";
import en from "javascript-time-ago/locale/en.json";
import { useEffect, useState } from "react";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { nanoid } from "nanoid";

const parser = new Parser({});

interface Story {
  guid: string;
  title: string;
  subtitle: string;
  link?: string;
  content?: string;
  icon: Image.ImageLike;
  isNew: boolean;
  date: number;
  fromFeed: string;
}

type FeedLastViewed = {
  [key: string]: number;
};

TimeAgo.addDefaultLocale(en);
const timeAgo = new TimeAgo("en-US");

function StoryListItem(props: { item: Story }) {
  return (
    <List.Item
      icon={props.item.icon}
      title={props.item.title}
      subtitle={props.item.subtitle}
      actions={
        <ActionPanel>
          <OpenStory item={props.item} />
          <ReadStory item={props.item} />
          <CopyStory item={props.item} />
        </ActionPanel>
      }
      accessories={[
        {
          text: timeAgo.format(props.item.date) as string,
          icon: props.item.isNew ? { source: Icon.Dot, tintColor: Color.Green } : undefined,
        },
      ]}
    />
  );
}

function ReadStory(props: { item: Story }) {
  return props.item.content ? (
    <Action.Push icon={Icon.Book} title="Read Story" target={<StoryDetail item={props.item} />} />
  ) : null;
}

function OpenStory(props: { item: Story }) {
  return props.item.link ? <Action.OpenInBrowser url={props.item.link} /> : null;
}

function CopyStory(props: { item: Story }) {
  return props.item.link ? (
    <Action.CopyToClipboard content={props.item.link} title="Copy Link" shortcut={{ modifiers: ["cmd"], key: "." }} />
  ) : null;
}

function ItemToStory(item: Parser.Item, feed: Feed, lastViewed: number) {
  const date = item.pubDate ? Date.parse(item.pubDate) : 0;
  return {
    guid: item.guid || nanoid(),
    title: item.title || "No title",
    subtitle: feed.title,
    link: item.link,
    content: item.content,
    isNew: date > lastViewed,
    date,
    icon: feed.icon,
    fromFeed: feed.url,
  } as Story;
}

async function getStories(feeds: Feed[]) {
  const feedLastViewedString = (await LocalStorage.getItem("feedLastViewed")) as string;
  const feedLastViewed = feedLastViewedString
    ? (JSON.parse(feedLastViewedString) as FeedLastViewed)
    : ({} as FeedLastViewed);

  const storyItems: Story[] = [];

  for (const feedItem of feeds) {
    const lastViewed = feedLastViewed[feedItem.url] || 0;
    try {
      const feed = await parser.parseURL(feedItem.url);
      const stories: Story[] = [];
      feed.items.forEach((item) => {
        stories.push(ItemToStory(item, feedItem, lastViewed));
      });
      feedLastViewed[feedItem.url] = stories.at(0)?.date || lastViewed;
      storyItems.push(...stories);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Can't get stories",
        message: "Error occured when fetching " + feedItem.title,
      });
    }
  }
  storyItems.sort((a, b) => b.date - a.date);
  await LocalStorage.setItem("feedLastViewed", JSON.stringify(feedLastViewed));
  return storyItems;
}

export function StoriesList(props: { feeds?: Feed[] }) {
  const [feeds, setFeeds] = useState<Feed[]>([] as Feed[]);
  const [stories, setStories] = useState<Story[]>([] as Story[]);
  const [loading, setLoading] = useState(false);

  async function fetchFeeds() {
    if (props?.feeds) {
      setFeeds(props.feeds);
    } else {
      setFeeds(await getFeeds());
    }
  }

  async function fetchStories() {
    if (feeds.length === 0) {
      return;
    }
    setLoading(true);
    setStories(await getStories(feeds));
    setLoading(false);
  }

  useEffect(() => {
    fetchFeeds();
  }, []);

  useEffect(() => {
    fetchStories();
  }, [feeds]);

  return (
    <List
      isLoading={loading}
      actions={
        !props?.feeds && (
          <ActionPanel>
            <Action.Push
              title="Add Feed"
              target={<AddFeedForm callback={setFeeds} />}
              icon={{ source: Icon.Plus, tintColor: Color.Green }}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel>
        )
      }
    >
      {stories.map((story) => (
        <StoryListItem key={story.guid} item={story} />
      ))}
    </List>
  );
}

function StoryDetail(props: { item: Story }) {
  return (
    <Detail
      markdown={NodeHtmlMarkdown.translate(props.item.content || "")}
      actions={
        <ActionPanel>
          <OpenStory item={props.item} />
          <CopyStory item={props.item} />
        </ActionPanel>
      }
    />
  );
}

export default () => {
  return <StoriesList />;
};
