// Exporta la ESTRUCTURA de la base (tablas, columnas, vistas, procedimientos,
// funciones y triggers) a db/esquema.sql. Solo hace SELECT: no cambia nada.
// No exporta datos de clientes ni contraseñas; solo unos conteos de revisión.
// Uso (desde la carpeta backend):  node db/exportar-esquema.js
const fs = require('fs');
const path = require('path');
const { poolPromise } = require('./connection');

(async () => {
  const pool = await poolPromise;
  const out = [];
  const linea = t => out.push(t);

  linea('-- ESQUEMA MultiStore_ShopAholic · generado ' + new Date().toISOString());
  linea('-- Solo estructura. Sin datos.\n');

  // 1) Tablas y columnas (incluye columnas calculadas)
  const cols = (await pool.request().query(`
    SELECT s.name AS Esquema, t.name AS Tabla, c.column_id, c.name AS Columna,
           ty.name AS Tipo, c.max_length, c.precision, c.scale, c.is_nullable,
           cc.definition AS Calculada
    FROM sys.tables t
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    JOIN sys.columns c ON c.object_id = t.object_id
    JOIN sys.types ty ON ty.user_type_id = c.user_type_id
    LEFT JOIN sys.computed_columns cc ON cc.object_id = c.object_id AND cc.column_id = c.column_id
    ORDER BY s.name, t.name, c.column_id`)).recordset;
  linea('/* ===================== TABLAS ===================== */');
  let actual = '';
  for (const c of cols) {
    const t = `${c.Esquema}.${c.Tabla}`;
    if (t !== actual) { if (actual) linea(');\n'); linea(`TABLE ${t} (`); actual = t; }
    const tipo = ['decimal', 'numeric'].includes(c.Tipo) ? `${c.Tipo}(${c.precision},${c.scale})`
      : ['varchar', 'nvarchar', 'char', 'nchar', 'varbinary'].includes(c.Tipo) ? `${c.Tipo}(${c.max_length === -1 ? 'max' : (c.Tipo.startsWith('n') ? c.max_length / 2 : c.max_length)})`
      : c.Tipo;
    linea(`  ${c.Columna} ${c.Calculada ? 'AS ' + c.Calculada : tipo}${c.is_nullable ? '' : ' NOT NULL'}`);
  }
  if (actual) linea(');\n');

  // 2) Llaves foráneas
  const fks = (await pool.request().query(`
    SELECT OBJECT_NAME(f.parent_object_id) AS Tabla, COL_NAME(fc.parent_object_id, fc.parent_column_id) AS Columna,
           OBJECT_NAME(f.referenced_object_id) AS Ref, COL_NAME(fc.referenced_object_id, fc.referenced_column_id) AS RefCol
    FROM sys.foreign_keys f JOIN sys.foreign_key_columns fc ON fc.constraint_object_id = f.object_id
    ORDER BY 1, 2`)).recordset;
  linea('/* ===================== LLAVES FORÁNEAS ===================== */');
  fks.forEach(f => linea(`-- ${f.Tabla}.${f.Columna} -> ${f.Ref}.${f.RefCol}`));
  linea('');

  // 3) Vistas, procedimientos, funciones y triggers (código completo)
  const mods = (await pool.request().query(`
    SELECT o.type_desc AS Tipo, SCHEMA_NAME(o.schema_id) + '.' + o.name AS Objeto, m.definition AS Definicion
    FROM sys.sql_modules m JOIN sys.objects o ON o.object_id = m.object_id
    ORDER BY o.type_desc, o.name`)).recordset;
  for (const m of mods) {
    linea(`/* ===================== ${m.Tipo}: ${m.Objeto} ===================== */`);
    linea((m.Definicion || '').trim());
    linea('GO\n');
  }

  // 4) Conteos de revisión (sin nombres ni datos personales)
  const r = (await pool.request().query(`
    SELECT COUNT(*) AS TotalLineas,
           SUM(CASE WHEN CantidadArticulos > 1 THEN 1 ELSE 0 END) AS LineasCantidadMayor1,
           SUM(CASE WHEN CantidadArticulos > 1 AND ValorCobroCliente > 0
                     AND ValorCobroCliente < ValorCompraLempiras * CantidadArticulos THEN 1 ELSE 0 END) AS LineasSospechosas
    FROM C_DetallePedido`)).recordset[0];
  linea('/* ===================== CONTEOS ===================== */');
  linea(`-- ${JSON.stringify(r)}`);

  const archivo = path.join(__dirname, 'esquema.sql');
  fs.writeFileSync(archivo, out.join('\n'), 'utf8');
  console.log(`Listo: ${archivo}`);
  console.log(`${cols.length} columnas · ${mods.length} vistas/procedimientos/funciones/triggers`);
  process.exit(0);
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
