import React from "react";

function radioButtonFromData<V extends RadioButtonNeeds>(
  handleSelection: (v: V) => void,
  selectedValue: V | undefined,
  row: V
) {
  const thisOne = row.key;
  const onChange = (row: V) => () => {
    handleSelection(row);
  };
  return (
    <li key={thisOne}>
      <label>
        <input
          className="radio"
          type="radio"
          value={thisOne}
          key={thisOne}
          checked={selectedValue?.key === thisOne}
          onChange={onChange(row)}
        />
        {row.text}
      </label>
    </li>
  );
}

type RadioButtonNeeds = { key: string; text: string };

export function RadioButtonList<V extends RadioButtonNeeds>(props: {
  radioButtons: Array<V>;
  handleSelection: (v: V) => void;
}) {
  const [selectedValue, setSelectedValue] = React.useState<V | undefined>(undefined);

  function handleSelection(V: V) {
    setSelectedValue(V);
    props.handleSelection(V);
  }
  return <ul>{props.radioButtons.map((row) => radioButtonFromData(handleSelection, selectedValue, row))}</ul>;
}
