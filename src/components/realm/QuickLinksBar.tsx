import { Link } from "@tanstack/react-router";
import { Button } from "../ui/button";
import {
  Swords,
  Users,
  Scroll,
  Map,
  Compass,
  Calendar,
  MapPin,
  Dices,
  Cat,
  Wand2,
  Book,
} from "lucide-react";

export function QuickLinksBar() {
  return (
    <div className="flex flex-wrap gap-2">
      <Link to="/realms/maps">
        <Button variant="amber" size="sm" className="gap-1.5">
          <Map className="size-4" />
          World Map
        </Button>
      </Link>
      <Link to="/realms/calendar">
        <Button variant="sky" size="sm" className="gap-1.5">
          <Calendar className="size-4" />
          Calendar
        </Button>
      </Link>
      <Link to="/realms/factions">
        <Button variant="purple" size="sm" className="gap-1.5">
          <Swords className="size-4" />
          Factions
        </Button>
      </Link>
      <Link to="/realms/npcs">
        <Button variant="outline" size="sm" className="gap-1.5">
          <Users className="size-4" />
          NPCs
        </Button>
      </Link>
      <Link to="/realms/compendium">
        <Button variant="indigo" size="sm" className="gap-1.5">
          <Cat className="size-4" />
          Monsters
        </Button>
      </Link>
      <Link to="/realms/compendium" search={{ tab: "spells" }}>
        <Button variant="indigo" size="sm" className="gap-1.5">
          <Book className="size-4" />
          Spells
        </Button>
      </Link>
      <Link to="/realms/compendium" search={{ tab: "magic-items" }}>
        <Button variant="indigo" size="sm" className="gap-1.5">
          <Wand2 className="size-4" />
          Magic Items
        </Button>
      </Link>
      <Link to="/realms/locations/regions">
        <Button variant="outline" size="sm" className="gap-1.5">
          <Map className="size-4" />
          Regions
        </Button>
      </Link>
      <Link to="/realms/locations/pois">
        <Button variant="secondary" size="sm" className="gap-1.5">
          <MapPin className="size-4" />
          POIs
        </Button>
      </Link>
      <Link to="/realms/tables">
        <Button variant="green" size="sm" className="gap-1.5">
          <Dices className="size-4" />
          Tables
        </Button>
      </Link>
      <Link to="/realms/notes">
        <Button variant="blue" size="sm" className="gap-1.5">
          <Scroll className="size-4" />
          Notes
        </Button>
      </Link>
    </div>
  );
}
