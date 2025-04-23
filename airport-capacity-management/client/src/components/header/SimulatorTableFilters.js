import Select from "react-select";
import '../../styles/SimulatorTableFilters.css'; 
/**
 * Component for selectable filters of the Simulator table
 * Props:
 * - options: Array of options to display in the select dropdown
 * - value: Currently selected value
 * - onChange: Function to call when the selected value changes
 * - placeholder: Placeholder text for the select input
 * - label: Label for the select input
 */
const SimulatorTableFilters = ({
  options,
  value,
  onChange,
  placeholder = "Select...",
  label = "",
}) => {

  /**
   * Custom styles for the react-select component
   *  */
  const customStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: "#3b536c",
      color: "white",
      fontWeight: "600",
      fontSize: "large",
      border: "none",
      padding: "2px",
      borderRadius: "5px",

      cursor: "pointer",
    }),
    singleValue: (provided) => ({
      ...provided,
      color: "white",
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: "rgba(59, 83, 108, 0.95)",
      borderRadius: "5px",
      zIndex: 10,
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused ? "rgba(255, 255, 255, 0.2)" : "transparent",
      color: "white",
      cursor: "pointer",
    }),
    input: (provided) => ({
      ...provided,
      color: "white",
    }),
  };

  /**
   * Default fallback when user clears ising x in the selection
   * Reset all inputs to go back to default list of all planes
   */
  const getDefaultValueOnClear = () => {
    if (label === "Plane Type") return "All Types";
    if (label === "Plane Size") return "All Sizes";
    if (label === "FBO") return "All FBOs";
    return "";
  };

  return (
    <div className="custom-select-wrapper">
      {label && <label className="custom-select-label">{label}</label>}
      <Select
        options={(options || []).map((opt) => ({ value: opt, label: opt }))}
        value={value ? { value, label: value } : null}
        onChange={(selected) =>
          onChange(selected ? selected.value : getDefaultValueOnClear())
        }
        placeholder={placeholder}
        styles={customStyles}
        isSearchable
        isClearable
        menuPlacement="auto"
        menuShouldScrollIntoView
        openMenuOnFocus
        openMenuOnClick
      />
    </div>
  );
};

export default SimulatorTableFilters;
