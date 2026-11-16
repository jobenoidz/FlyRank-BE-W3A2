const express = require('express');
const app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerDoc = require('./swagger.json');
const Database = require('better-sqlite3')

const db = new Database('tasks.db', { verbose: console.log });
const port = 3000;

app.use(express.json());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc))

//Stage 0
db.exec(`
CREATE TABLE IF NOT EXISTS tasks (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT    NOT NULL,
    done  BOOLEAN NOT NULL DEFAULT 0
)`);

const INIT_TASKS = [
    { title: "Cook breakfast", done: 0 },
    { title: "Set appointment", done: 1 },
    { title: "Clean bedroom", done: 0 },
]

const createTask = db.prepare('INSERT INTO tasks (title, done) VALUES (@title, @done)');

const { count }
    = db.prepare('SELECT COUNT(*) AS count FROM tasks').get();

if (count === 0) {
    const insertMany = db.transaction((tasks) => {
        for (const task of tasks) createTask.run(task);
    });
    insertMany(INIT_TASKS);
}
app.get('/', (req, res) => {
    res.json({ "name": "Task API", "version": "1.0", "endpoints": ["/tasks"] });
});

app.get('/health', (req, res) => {
    res.send({ "status": "ok" });
});

//Stage 1
app.get('/tasks', (req, res) => {
    tasks = db.prepare('SELECT * FROM tasks').all();
    res.send(tasks);
});

app.get('/tasks/:id', (req, res) => {
    const id = Number(req.params.id);
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

    if (!task) {
        return res.status(404).json({ error: `Task ${id} not found` })
    }

    res.json(task)
})

//Stage 2
app.post('/tasks', (req, res) => {
    if (req.body === undefined || req.body === null || typeof req.body !== 'object') {
        return res.status(400).json({ error: "Missing body" })
    }
    const { title } = req.body;

    if (title === "" || title === " " || title === null || title === undefined) {
        return res.status(400).json({ error: "Title missing" })
    };

    const new_task = db.prepare('INSERT INTO tasks (title, done) VALUES (@title, @done)');
    new_task.run({ title: title, done: 0 });

    res.status(201).json(new_task);
})

//Stage 3
app.put('/tasks/:id', (req, res) => {
    const id = Number(req.params.id);
    const { title, done } = req.body;

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!task) {
        return res.status(404).json({ error: `Task ${id} not found` })
    }

    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ error: "No Title and Done status found." });
    }

    if (title !== undefined) {
        if (title === "" || title === null || typeof title !== 'string') {
            return res.status(400).json({ error: "Invalid Title" })
        };
    };

    if (done !== undefined) {
        if (done !== 0 && done !== 1) {
            return res.status(400).json({ error: "Invalid Done value" })
        }
    };

    const newTitle = title !== undefined ? title : task.title;
    const newDone = done !== undefined ? done : task.done;

    db.prepare('UPDATE tasks SET title = ?, done = ? WHERE id = ?')
        .run(newTitle, newDone, id)

    const updatedTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

    res.status(200).json(updatedTask);
})

app.delete('/tasks/:id', (req, res) => {
    const id = Number(req.params.id);
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

    if (!task) {
        return res.status(404).json({ error: `Task ${id} not found` })
    }

    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    res.status(204).send();
})


app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});