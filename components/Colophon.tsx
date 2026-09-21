import VoiceLabel from "@/components/VoiceLabel";
import { CURRICULUM_SETS } from "@/data/curriculum";
import { VERB_LIST } from "@/lib/conjugation/verbs";
import { ACTIVE_TENSES } from "@/lib/conjugation/types";

/**
 * Ft4 · dense colophon. Real counts only — nothing here is invented.
 */
export default function Colophon() {
  const terms = CURRICULUM_SETS.reduce((n, s) => n + s.rows.length, 0);
  const sets = CURRICULUM_SETS.length;

  return (
    <footer style={{ borderTop: "var(--rule-hair) solid var(--color-rule-2)" }}>
      <div
        className="mx-auto w-full data"
        style={{
          maxWidth: "74rem",
          paddingInline: "var(--page-gutter)",
          paddingBlock: "var(--space-lg)",
          fontSize: "var(--text-2xs)",
          lineHeight: 1.9,
          color: "var(--color-muted)",
          letterSpacing: "0.04em",
        }}
      >
        SA Español 4 — Study Tool. {sets} vocabulary {sets === 1 ? "set" : "sets"}, {terms} terms.{" "}
        {VERB_LIST.length} verbs across {ACTIVE_TENSES.length} tenses. Vocabulary and tests are generated
        from the class packets in data/curriculum.ts. Progress is stored in this browser only.
        Set in Fraunces, IBM Plex Sans and JetBrains Mono.
        <VoiceLabel />
      </div>
    </footer>
  );
}
