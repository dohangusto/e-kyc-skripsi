import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/components/ui/select";
import { useRole } from "@/presentation/components/role-context";
import type { Role } from "@/domain/types";

const roleOptions: { label: string; value: Role }[] = [
  { label: "Verifier", value: "VERIFIER" },
  { label: "Supervisor", value: "SUPERVISOR" },
];

export const RoleSwitcher = () => {
  const { role, setRole } = useRole();

  return (
    <Select value={role} onValueChange={(value) => setRole(value as Role)}>
      <SelectTrigger className="w-[160px]">
        <SelectValue placeholder="Select role" />
      </SelectTrigger>
      <SelectContent>
        {roleOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
