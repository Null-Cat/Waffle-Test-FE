import "./App.css";
import Game from "./components/Game";
import Header from "./components/Header";

function App() {
  return (
    <>
      <div className="centre">
        <div className="app">
          <Header />
          <Game />
        </div>
      </div>
    </>
  );
}

export default App;
