const { sql, poolPromise } = require('../db/connection');

/* ===== CATEGORÍAS ===== */
const getCategorias = async (req, res) => {
    try {
        const pool = await poolPromise;
        const r = await pool.request().execute('Se_Categorias');
        res.json({ ok: true, data: r.recordset });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

const crearCategoria = async (req, res) => {
    try {
        const { Categoria } = req.body;
        if (!Categoria?.trim()) return res.status(400).json({ ok: false, error: 'Nombre requerido.' });
        const pool = await poolPromise;
        await pool.request()
            .input('Categoria', sql.NVarChar(sql.MAX), Categoria.trim())
            .execute('In_Categorias');
        res.json({ ok: true, mensaje: 'Categoría creada correctamente.' });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

const editarCategoria = async (req, res) => {
    try {
        const { IdCategoria, Nombre } = req.body;
        if (!IdCategoria || !Nombre?.trim()) return res.status(400).json({ ok: false, error: 'Faltan datos.' });
        const pool = await poolPromise;
        await pool.request()
            .input('IdCategoria', sql.Int, parseInt(IdCategoria))
            .input('Nombre', sql.NVarChar(sql.MAX), Nombre.trim())
            .execute('UpCategorias');
        res.json({ ok: true, mensaje: 'Categoría actualizada.' });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

/* ===== ARTÍCULOS ===== */
const getArticulos = async (req, res) => {
    try {
        const pool = await poolPromise;
        const r = await pool.request().execute('Se_Articulos');
        res.json({ ok: true, data: r.recordset });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

const crearArticulo = async (req, res) => {
    try {
        const { Nombre, IdCategoria, Peso } = req.body;
        if (!Nombre?.trim() || !IdCategoria) return res.status(400).json({ ok: false, error: 'Faltan datos.' });
        const pool = await poolPromise;
        await pool.request()
            .input('Nombre',      sql.NVarChar(sql.MAX), Nombre.trim())
            .input('IdCategoria', sql.Int,               parseInt(IdCategoria))
            .input('Peso',        sql.Decimal(18,2),     parseFloat(Peso) || 0)
            .execute('In_Articulos');
        res.json({ ok: true, mensaje: 'Artículo creado correctamente.' });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

const editarArticulo = async (req, res) => {
    try {
        const { IdArticulo, IdCategoria, NombreArticulo, Peso } = req.body;
        if (!IdArticulo || !NombreArticulo?.trim() || !IdCategoria) return res.status(400).json({ ok: false, error: 'Faltan datos.' });
        const pool = await poolPromise;
        await pool.request()
            .input('IdArticulo',    sql.Int,               parseInt(IdArticulo))
            .input('IdCategoria',   sql.Int,               parseInt(IdCategoria))
            .input('NombreArticulo',sql.NVarChar(sql.MAX), NombreArticulo.trim())
            .input('Peso',          sql.Decimal(18,2),     parseFloat(Peso) || 0)
            .execute('UpArticulos');
        res.json({ ok: true, mensaje: 'Artículo actualizado.' });
    } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

module.exports = { getCategorias, crearCategoria, editarCategoria, getArticulos, crearArticulo, editarArticulo };
