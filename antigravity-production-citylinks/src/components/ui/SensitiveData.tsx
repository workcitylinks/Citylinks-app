import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SensitiveDataProps {
  value: string;
  visibleChars?: number;
}

const SensitiveData = ({ value, visibleChars = 4 }: SensitiveDataProps) => {
  const [visible, setVisible] = useState(false);

  if (!value) return <span className="text-muted-foreground">—</span>;

  const masked = value.length > visibleChars
    ? "•".repeat(value.length - visibleChars) + value.slice(-visibleChars)
    : value;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono text-sm">{visible ? value : masked}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => setVisible(!visible)}
      >
        {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </Button>
    </span>
  );
};

export default SensitiveData;
