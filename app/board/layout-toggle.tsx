import { LayoutGrid, List } from "lucide-react";

export default function LayoutToggle({ count, unit, ariaLabel, layout, onLayout }: {
  count: number;
  unit: string;
  ariaLabel: string;
  layout: "grid" | "list";
  onLayout: (layout: "grid" | "list") => void;
}) {
  return <div className="students-view-options">
    <span>{count} {unit}</span>
    <div className="layout-toggle" role="group" aria-label={ariaLabel}>
      <button type="button" aria-label="Vista mosaico" aria-pressed={layout === "grid"} onClick={() => onLayout("grid")}><LayoutGrid size={18} /></button>
      <button type="button" aria-label="Vista lista" aria-pressed={layout === "list"} onClick={() => onLayout("list")}><List size={18} /></button>
    </div>
  </div>;
}
