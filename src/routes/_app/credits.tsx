import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Heart } from "lucide-react";
import { PageHeader } from "~/components/shared/PageHeader";

export const Route = createFileRoute("/_app/credits")({
  component: CreditsPage,
});

interface Resource {
  name: string;
  url: string;
  by?: string;
  note: string;
}

// Inspirations & resources. Where a source is "all rights reserved," Realm
// Keeper ships ORIGINAL wording inspired by the category, not copied entries.
const INSPIRATIONS: Resource[] = [
  {
    name: "OSR Vault",
    url: "https://osrvault.com",
    by: "Casey Willis",
    note: "Random-table categories that inspired several of our generators — faction motivations, noble secrets, forest / roadside / settlement encounters, trinkets, curses, crypt dressings, harmless denizens, thieves'-guild quests, and more. OSR Vault's content is all rights reserved; our table entries are original wording, written to fit Realm Keeper.",
  },
  {
    name: "Dndspeak",
    url: "https://www.dndspeak.com/items-and-treasures/",
    note: "A deep well of d100 item & treasure lists that inspire our loot and trinket tables. Dndspeak's content is all rights reserved; our entries are original wording, not copied.",
  },
  {
    name: "Hexroll",
    url: "https://hexroll.app/",
    note: "A procedural sandbox / hexcrawl generator whose 'whole living region at once' approach inspired Realm Keeper's world generation.",
  },
];

const COMMUNITY: Resource[] = [
  {
    name: "TTRPG community lists (r/d100 and friends)",
    url: "https://www.reddit.com/r/d100/",
    note: "Curated community brainstorms inspired our shop names & types, plot hooks, settlement troubles, NPC traits, and village notable features. Entries were edited, condensed, and reskinned for a system-agnostic, grounded tone.",
  },
];

const SYSTEMS: Resource[] = [
  {
    name: "Cairn 2e",
    url: "https://cairnrpg.com",
    by: "Yochai Gal",
    note: "Ships as a built-in system; its region, faction, and character tables drive much of world generation. Cairn is released under Creative Commons (CC BY-SA).",
  },
  {
    name: "Shadowdark RPG",
    url: "https://www.thearcanelibrary.com/pages/shadowdark",
    by: "The Arcane Library",
    note: "Supported as a built-in system option.",
  },
];

function ResourceList({ items }: { items: Resource[] }) {
  return (
    <ul className="space-y-3">
      {items.map((r) => (
        <li key={r.url} className="rounded-lg border bg-card p-4">
          <a
            href={r.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
          >
            {r.name}
            <ExternalLink className="size-3.5" />
          </a>
          {r.by ? (
            <span className="ml-2 text-sm text-muted-foreground">by {r.by}</span>
          ) : null}
          <p className="mt-1.5 text-sm text-muted-foreground">{r.note}</p>
        </li>
      ))}
    </ul>
  );
}

function CreditsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Credits & Inspirations" />

      <div className="mx-auto max-w-2xl space-y-8">
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Heart className="mt-0.5 size-4 shrink-0 text-rose-400" />
          <span>
            Realm Keeper stands on the shoulders of the wider tabletop community.
            The people and projects below inspired our random tables and
            generators. Where a source reserves its rights, our table entries are
            original wording written to fit Realm Keeper — only the idea of the
            category is borrowed.
          </span>
        </p>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Table inspirations</h2>
          <ResourceList items={INSPIRATIONS} />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Community</h2>
          <ResourceList items={COMMUNITY} />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Game systems</h2>
          <ResourceList items={SYSTEMS} />
        </section>
      </div>
    </div>
  );
}
