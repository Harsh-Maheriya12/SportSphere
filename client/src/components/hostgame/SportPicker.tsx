import { SportsEnum } from "../../constants/SportsEnum";
import React from "react";

interface SportPickerProps {
  value: string;
  onChange: (sport: string) => void;
}


const SportPicker: React.FC<SportPickerProps> = ({ value, onChange }) => {
  return (
    <div className="group">
      <label className="block text-foreground mb-3 font-semibold flex items-center gap-2">
        <span className="w-2 h-2 bg-primary rounded-full group-hover:animate-pulse"></span>
        Select Sport *
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-4 rounded-xl bg-card/80 backdrop-blur border-2 border-primary/20 
          hover:border-primary/40 text-foreground font-medium 
          transition-all shadow-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
      >
        <option value="">Choose your sport</option>
        {Object.values(SportsEnum).map((sport) => (
          <option key={sport} value={sport}>
            {sport}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SportPicker;
