// "Start here" for a topic, the rest behind "More", and the subject's full course as the fallback.
import { videosFor, videoUrl, courseFor, readingFor, subjectReading, startHere, fitNote } from "../core/resources";
import { Icon } from "./kit";

export function TopicResources({ subject, topicId, minutes }: { subject: string; topicId: string | null; minutes?: number }) {
  const pick = topicId ? startHere(topicId, minutes) : undefined;
  const vids = topicId ? [...(pick ? [pick] : []), ...videosFor(topicId).filter((v) => v !== pick)] : [];
  const course = courseFor(subject);
  const [first, ...rest] = vids;
  const read = topicId ? readingFor(topicId) : [];
  const learnFrom = read.filter((r) => r.kind !== "questions"), ask = read.filter((r) => r.kind === "questions");
  const notes = subjectReading(subject);
  if (!first && !course && !read.length && !notes.length) return <p class="res-none">No resources picked for this topic yet.</p>;
  return <div class="res">
    {first ? <div class="res-main">
      <span class="eyebrow">Start here</span>
      <b>{first.title}</b>
      <span class="res-meta">{first.channel}, {first.minutes} min{minutes ? fitNote(first, minutes) : ""}, video {first.index} of the playlist</span>
      <div class="res-links">
        <a class="btn primary sm" href={videoUrl(first)} target="_blank" rel="noopener"><Icon.play /> Find on YouTube</a>
        <a class="linkbtn" href={first.playlist} target="_blank" rel="noopener">Open playlist</a>
      </div>
    </div> : <p class="res-none">No single video picked for this topic. The full course below covers it.</p>}
    {rest.length > 0 && <details class="res-more"><summary>{rest.length} more for this topic</summary>
      <ul>{rest.map((v) => <li><a href={videoUrl(v)} target="_blank" rel="noopener">{v.title}</a><span>{v.channel.replace(/\s*\(.*\)/, "")}, {v.minutes} min</span></li>)}</ul>
    </details>}
    {learnFrom.length > 0 && <div class="res-read"><span class="eyebrow">Read</span><ul>{learnFrom.map((r) => <li><a href={r.url} target="_blank" rel="noopener">{r.title}</a><span>{r.source}</span></li>)}</ul></div>}
    {ask.length > 0 && <div class="res-read"><span class="eyebrow">Practise answering</span><ul>{ask.map((r) => <li><a href={r.url} target="_blank" rel="noopener">{r.title}</a><span>{r.source}</span></li>)}</ul></div>}
    {!first && !learnFrom.length && notes.length > 0 && <p class="res-course">Notes for this subject: {notes.map((n, i) => <>{i ? ", " : ""}<a href={n.url} target="_blank" rel="noopener">{n.title}</a> ({n.source})</>)}</p>}
    {course && <p class="res-course">Full course: <a href={course.url} target="_blank" rel="noopener">{course.title}</a>, {course.channel}, {course.length}{course.search ? " (opens a YouTube search)" : ""}</p>}
  </div>;
}
