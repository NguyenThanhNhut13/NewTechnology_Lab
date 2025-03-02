const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json({extended: false}));
app.use(express.static('./views'));
app.set('view engine', 'ejs');
app.set('views', './views');

app.get('/', (req, res) => {
    res.render('index');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
