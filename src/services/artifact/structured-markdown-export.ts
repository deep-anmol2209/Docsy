/**
 * Renders a structured artifact envelope down to Markdown, purely as a
 * derived convenience copy stored in `Artifact.content` — used by the
 * existing Copy/Download features, which predate structured artifacts and
 * only know how to work with a text string. The structured JSON in
 * `Artifact.metadata.artifactData` remains the actual source of truth for
 * rendering; this is never read back or re-parsed.
 */

import { ArtifactType } from "@/lib/generated/prisma/enums";
import type {
  AnyStructuredArtifactEnvelope,
} from "@/src/services/artifact/schema/index";

export function structuredArtifactToMarkdown(
  envelope: AnyStructuredArtifactEnvelope,
): string {
  switch (envelope.type) {
    case ArtifactType.FLASHCARDS: {
      return envelope.data.cards
        .map(
          (card) =>
            `**Q:** ${card.question}\n**A:** ${card.answer}`,
        )
        .join("\n\n");
    }

    case ArtifactType.QUIZ: {
      return envelope.data.questions
        .map((question, index) => {
          const options = question.options
            .map((option) => {
              const isCorrect =
                option.id === question.correctOptionId;

              return `- ${
                isCorrect ? "**" : ""
              }${option.text}${
                isCorrect ? "**" : ""
              }`;
            })
            .join("\n");

          return `${index + 1}. ${question.prompt}\n${options}${
            question.explanation
              ? `\n\n_${question.explanation}_`
              : ""
          }`;
        })
        .join("\n\n");
    }

    case ArtifactType.MIND_MAP: {
      const renderNode = (
        node: typeof envelope.data.root,
        depth: number,
      ): string => {
        const line = `${"  ".repeat(depth)}- ${node.label}`;

        const children = (node.children ?? [])
          .map((child) => renderNode(child, depth + 1))
          .join("\n");

        return children ? `${line}\n${children}` : line;
      };

      return renderNode(envelope.data.root, 0);
    }

    case ArtifactType.TABLE: {
      const { columns, rows } = envelope.data;

      const header =
        `| ${columns.map((column) => column.label).join(" | ")} |`;

      const separator =
        `| ${columns.map(() => "---").join(" | ")} |`;

      const body = rows
        .map(
          (row) =>
            `| ${columns
              .map((column) => row[column.id] ?? "")
              .join(" | ")} |`,
        )
        .join("\n");

      return `${header}\n${separator}\n${body}`;
    }

    case ArtifactType.FAQ: {
      return envelope.data.items
        .map(
          (item) =>
            `**Q:** ${item.question}\n**A:** ${item.answer}`,
        )
        .join("\n\n");
    }
  }
}