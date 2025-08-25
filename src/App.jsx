import { useState } from 'react'
import Header from './components/layout/Header.jsx'
import TimelineView from './views/TimelineView.jsx'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './components/ui/Modal.jsx'
import EventForm from './components/events/EventForm.jsx'
import { useEvents } from './hooks/useEvents'
import { useToast } from './hooks/useToast'
import Button from './components/ui/Button.jsx'
import { Plus } from 'lucide-react'

function App() {
  const { addEvent } = useEvents()
  const toast = useToast()
  const [openAdd, setOpenAdd] = useState(false)
  // Validation handled inside EventForm on submit; keep parent stateless

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col">
        <TimelineView />
      </main>
      <Button
        onClick={() => setOpenAdd(true)}
        aria-label="Add Event"
        title="Add event"
        className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg flex items-center justify-center gap-2 md:w-auto md:h-10 md:px-4"
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
        <span className="hidden md:inline">Add event</span>
      </Button>

      <Dialog open={openAdd} onOpenChange={(next) => { if (!next) setOpenAdd(false) }}>
        <DialogContent aria-label="Add Event">
          <DialogHeader>
            <DialogTitle>Add Event</DialogTitle>
            <DialogDescription className="sr-only">Create a new event.</DialogDescription>
          </DialogHeader>
          <EventForm
            onCancel={() => setOpenAdd(false)}
            onSubmit={(val) => {
              addEvent({
                title: val.title,
                body: val.body,
                type: val.type,
                start: val.start,
                ...(val.end ? { end: val.end } : {}),
              })
              setOpenAdd(false)
              toast.success('Event added')
            }}
            labels={{ submitLabel: 'Add', cancelLabel: 'Cancel' }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default App


