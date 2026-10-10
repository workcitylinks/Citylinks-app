import { ArrowLeft, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ProfessionalAccessPromptProps {
  title: string;
  message: string;
  actionLabel: string;
  actionRoute: string;
}

const ProfessionalAccessPrompt = ({ title, message, actionLabel, actionRoute }: ProfessionalAccessPromptProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen mesh-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Card className="glass-strong p-6 text-center space-y-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-muted-foreground mt-2">{message}</p>
          </div>
          <div className="flex justify-between gap-3 pt-2">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button onClick={() => navigate(actionRoute)}>
              {actionLabel} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProfessionalAccessPrompt;