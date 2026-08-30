import { useContext } from "react";
import {
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { HomeFilterContext } from "../context/HomeFilterContext";

const fmt = (iso) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("es-ES") : "—";

function HomeDateFilter() {
  const { mode, setMode, setCustom, range } = useContext(HomeFilterContext);

  return (
    <div style={{ margin: "10px 0 20px" }}>
      <Stack
        direction="row"
        spacing={2}
        alignItems="center"
        useFlexGap
        flexWrap="wrap"
      >
        <ToggleButtonGroup
          size="small"
          exclusive
          value={mode === "custom" ? null : mode}
          onChange={(_e, v) => v && setMode(v)}
        >
          <ToggleButton value="mes">Mes actual</ToggleButton>
          <ToggleButton value="anio">Año actual</ToggleButton>
        </ToggleButtonGroup>

        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            type="date"
            size="small"
            label="Desde"
            InputLabelProps={{ shrink: true }}
            value={range.from || ""}
            onChange={(e) => setCustom(e.target.value, range.to)}
          />
          <TextField
            type="date"
            size="small"
            label="Hasta"
            InputLabelProps={{ shrink: true }}
            value={range.to || ""}
            onChange={(e) => setCustom(range.from, e.target.value)}
          />
        </Stack>

        <Typography variant="body2" color="text.secondary">
          {fmt(range.from)} – {fmt(range.to)}
        </Typography>
      </Stack>
    </div>
  );
}

export default HomeDateFilter;
