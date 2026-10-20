import { createFileRoute } from "@tanstack/react-router";
import { EnterprisePage } from "./pricing";

export const Route = createFileRoute("/enterprise")({
  head: () => ({
    meta: [
      { title: "Enterprise Software & Systems | Tarrlogic Systems" },
      {
        name: "description",
        content:
          "Tarrlogic builds enterprise software, connected business systems, and digital products that make work easier for teams and their customers.",
      },
    ],
  }),
  component: EnterprisePage,
});