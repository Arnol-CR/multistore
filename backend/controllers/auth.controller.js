const { sql, poolPromise } = require('../db/connection');

const login = async (req, res) => {
    try {
        const { usuario, password } = req.body;

        const pool = await poolPromise;
        const result = await pool.request()
            .input('Correo',     sql.NVarChar, usuario)
            .input('Contrasena', sql.NVarChar, password)
            .execute('SP_Login');

        if (result.recordset.length === 0) {
            return res.status(401).json({ 
                ok: false, 
                mensaje: 'Usuario o contraseña incorrectos' 
            });
        }

        const vendedor = result.recordset[0];
        res.json({
            ok: true,
            usuario: {
                id:       vendedor.IdVendedor,
                nombres:  vendedor.Nombres,
                apellidos:vendedor.Apellidos,
                correo:   vendedor.Correo,
                codigo:   vendedor.CodigoVendedor,
                esAdmin:  vendedor.EsAdministrador
            }
        });

    } catch (err) {
        console.error('Error login:', err.message);
        res.status(500).json({ ok: false, error: err.message });
    }
};

module.exports = { login };