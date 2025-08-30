import Header from './components/layout/Header.jsx'
import TimelineView from './views/TimelineView.jsx'
import Aside from './components/layout/Aside.jsx'

function App() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left sticky aside across the whole page */}
      <Aside />
      {/* Right content area: header + rest */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <Header />
        </div>
        <main className="flex-1 flex flex-col overflow-auto">
          <TimelineView />
        </main>
      </div>
    </div>
  )
}

export default App


