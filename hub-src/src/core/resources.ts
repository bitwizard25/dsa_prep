// The curated library: videos per topic (from your YouTube lists) and a full course per subject.
import { VIDEOS, COURSES, type Video } from "../data/videos";
import { READING, SUBJECT_READING, CREDITS, type Reading } from "../data/reading";

/** Our data has no per-video links, so a video opens as a YouTube search for its exact title and channel. */
export const videoUrl = (v: Video) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${v.title} ${v.channel.replace(/\s*\(.*\)/, "")}`)}`;

/** Videos for a topic: the ones that mainly teach it first (in course order), then ones that also touch it. */
export function videosFor(topicId: string): Video[] {
  const main = VIDEOS.filter((v) => v.topics[0] === topicId).sort((a, b) => a.index - b.index);
  const also = VIDEOS.filter((v) => v.topics[0] !== topicId && v.topics.includes(topicId));
  return [...main, ...also];
}
/** The video to start with: the first in course order that fits the session; otherwise the first one. */
export const startHere = (topicId: string, sessionMin?: number): Video | undefined => {
  const all = videosFor(topicId);
  return (sessionMin ? all.find((v) => v.minutes <= sessionMin) : undefined) || all[0];
};
/** "watch over 2 sessions" when a video is longer than the session. */
export const fitNote = (v: Video, sessionMin: number) => (v.minutes > sessionMin ? `, watch over ${Math.ceil(v.minutes / sessionMin)} sessions` : "");
export const courseFor = (subject: string) => COURSES.find((c) => c.subject === subject);
export type { Video };

/** Reading for a topic: cheatsheets and guides to learn from, worked solutions, and open questions to practise. */
export const readingFor = (topicId: string) => READING.filter((r) => r.topics.includes(topicId));
export const subjectReading = (subject: string) => SUBJECT_READING.filter((r) => r.subject === subject);
export { CREDITS };
export type { Reading };
