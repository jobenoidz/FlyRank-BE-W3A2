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



//Stage 3
app.post('/tasks', (req, res) => {
    if (req.body === undefined || req.body === null || typeof req.body !== 'object') {
        return res.status(400).json({ error: "Missing body" })
    }
    const { title } = req.body;

    if (title === "" || title === " " || title === null || title === undefined) {
        return res.status(400).json({ error: "Title missing" })
    };

    const last_id = tasks.length === 0 ? 0 : Math.max(...tasks.map((t) => t.id));
    const new_task = { id: (last_id + 1), title: title, done: false };

    tasks.push(new_task);
    res.status(201).json(new_task);
})

//Stage 4

app.put('/tasks/:id', (req, res) => {
    const id = Number(req.params.id);
    const task = tasks.find((t) => t.id === id);

    const { title, done } = req.body;

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
        task.title = title;
    };

    if (done !== undefined) {
        if (typeof done !== 'boolean') {
            return res.status(400).json({ error: "Invalid Done value" })
        };
        task.done = done;
    };

    res.status(200).json(task);
})

app.delete('/tasks/:id', (req, res) => {
    const id = Number(req.params.id);
    const task = tasks.findIndex((t) => t.id === id);

    if (task === -1) {
        return res.status(404).json({ error: `Task ${id} not found` })
    }

    tasks.splice(task, 1);
    res.status(204).send();
})





app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});