# Notes to self, while developing this app.

## 28 Feb 2025

I have a few hours on an airplane to get this app under my fingers again. Ivana has given us ideas for making it look nicer, the start of it anyway.

### The progress bar

The progress bar is helpful if people know it is there, but they do not know that it is tracking progress.
My design of it is clever, and amused me at the time.

The progress through the app is:

- give us your name for the leaderboard (internally: moniker)
- give us your Honeycomb API key
- display success, tell people what is happening (this will be new)
- ask them a question
  - or two or three? Martin wants to make this configurable
- show them some data; ask questions about that
  - how many?
- a congratulations screen

Now, I think making the questions configurable is a problem we don't have yet.
but, if I want to leave that possibility open, then I have to ask - how many items go on the progress bar?
Can we expect to load the configuration immediately, so we know how many questions there will be?

The current progress bar is clever: it tries to give you progress in terms of sections, and then more detailed progress within a section after you get there.

The drawing Ivana gave us has a much simpler progress bar and I like it. It's better. If I display that, how many items are on it??
Does it grow when we load the questions??

This is too much thought to put into a progress bar.
Right now there are 3 text questions plus 2 data questions.

There are 9 screens in the app. How about 9 boxes.

It might be _easier_ from my current position to have the number of boxes grow as it loads.
I can start by working on the appearance, and think about the logic later.

### Tracing

The tracing for this app is weird. I would love to add a 'description' field to each span!
... but that is not something i can work on offline.
