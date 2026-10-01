import BotChat from "./BotChat";
import "./style.css";

// Página dedicada de Agustín (/bot). El mismo chat también está disponible
// como widget flotante desde cualquier pantalla (ver BotWidget.jsx).
function Bot() {
  return (
    <div className="bot-page">
      <BotChat />
    </div>
  );
}

export default Bot;
