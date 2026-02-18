import { CompendiumEquipment } from "~/domain/entities/Compendium";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

export function EquipmentTable({ items }: { items: CompendiumEquipment[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead className="text-right">Cost</TableHead>
          <TableHead className="text-right">Damage</TableHead>
          <TableHead className="text-right">Armor</TableHead>
          <TableHead className="text-right">Slots</TableHead>
          <TableHead>Properties</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const sd = item.systemData;
          let cost: string;
          let category: string;
          let armor = "—";
          let slots = "—";
          if (sd.system === "cairn") {
            cost = sd.data.cost ? `${sd.data.cost} gp` : "—";
            category = sd.data.category;
            if (sd.data.armor != null) armor = String(sd.data.armor);
            if (sd.data.slots != null) slots = String(sd.data.slots);
          } else if (sd.system === "shadowdark") {
            cost = `${sd.data.cost.amount} ${sd.data.cost.currency}`;
            category = sd.data.itemType;
            if (sd.data.slot > 0) slots = String(sd.data.slot);
          } else {
            cost = sd.data.cost || "—";
            category = sd.data.category || "—";
          }
          const damage = sd.data.damage ?? "—";
          const properties = sd.data.properties;

          return (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">
                  {category}
                </Badge>
              </TableCell>
              <TableCell className="text-right text-sm">{cost}</TableCell>
              <TableCell className="text-right text-sm">{damage}</TableCell>
              <TableCell className="text-right text-sm">{armor}</TableCell>
              <TableCell className="text-right text-sm">{slots}</TableCell>
              <TableCell>
                {properties.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {properties.map((p) => (
                      <Badge
                        key={p}
                        className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs"
                      >
                        {p}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
