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
          const cost =
            sd.system === "cairn"
              ? sd.data.cost
                ? `${sd.data.cost} gp`
                : "—"
              : `${sd.data.cost.amount} ${sd.data.cost.currency}`;
          const category =
            sd.system === "cairn" ? sd.data.category : sd.data.itemType;
          const damage = sd.data.damage ?? "—";
          const armor =
            sd.system === "cairn"
              ? sd.data.armor != null
                ? String(sd.data.armor)
                : "—"
              : "—";
          const slots =
            sd.system === "cairn"
              ? sd.data.slots != null
                ? String(sd.data.slots)
                : "—"
              : sd.data.slot > 0
                ? String(sd.data.slot)
                : "—";
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
