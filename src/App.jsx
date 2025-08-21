import { useState } from 'react'
import Header from './components/layout/Header.jsx'
import TimelineView from './views/TimelineView.jsx'
import FloatingButton from './components/layout/FloatingButton.jsx'
import Modal from './components/ui/Modal.jsx'
import EventForm from './components/events/EventForm.jsx'
import { useEvents } from './hooks/useEvents'
import { useToast } from './hooks/useToast'

function App() {
  const { addEvent } = useEvents()
  const toast = useToast()
  const [openAdd, setOpenAdd] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [formValue, setFormValue] = useState(null)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex flex-col">
        <TimelineView />
      </main>
      <FloatingButton onClick={() => setOpenAdd(true)} />

      <Modal open={openAdd} onClose={() => setOpenAdd(false)} ariaLabel="Add Event">
        <h3 className="text-lg font-semibold mb-3">Add Event</h3>
        <EventForm
          value={formValue || {}}
          onChange={setFormValue}
          onValidityChange={setIsValid}
          onCancel={() => setOpenAdd(false)}
          onSubmit={(val) => {
            if (!isValid) return
            addEvent({
              title: val.title,
              body: val.body,
              type: val.type,
              start: val.start,
              ...(val.end ? { end: val.end } : {}),
            })
            setOpenAdd(false)
            setFormValue(null)
            toast.success('Event added')
          }}
          labels={{ submitLabel: 'Add', cancelLabel: 'Cancel' }}
        />
      </Modal>
    </div>
  )
}

export default App
