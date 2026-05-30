const getTracking = async (req, res) => { res.json({ ok: true, codigo: req.params.codigo }); };
module.exports = { getTracking };
