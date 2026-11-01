-- Tablas del módulo de cotizaciones (el backend las crea solo si no existen)
IF OBJECT_ID('dbo.C_Cotizaciones', 'U') IS NULL
CREATE TABLE dbo.C_Cotizaciones (
  IdCotizacion INT IDENTITY(1,1) PRIMARY KEY,
  NumeroCotizacion NVARCHAR(30)  NULL,
  FechaDATETIME2 NOT NULL DEFAULT SYSDATETIME(),
  IdClienteINT   NULL,
  NombreClienteNVARCHAR(150) NULL,
  Telefono NVARCHAR(40)  NULL,
  IdVendedor   INT   NULL,
  IdCasillero  INT   NULL,
  TarifaLibra  DECIMAL(18,2) NOT NULL DEFAULT 0,
  ImpuestoPct  DECIMAL(9,2)  NOT NULL DEFAULT 8,
  MargenPctDECIMAL(9,2)  NOT NULL DEFAULT 18,
  TasaCambio   DECIMAL(18,4) NOT NULL DEFAULT 0,
  RedondearLibras  BIT   NOT NULL DEFAULT 1,
  TotalUSD DECIMAL(18,2) NOT NULL DEFAULT 0,
  TotalLempirasDECIMAL(18,2) NOT NULL DEFAULT 0,
  Estado   NVARCHAR(20)  NOT NULL DEFAULT 'Borrador',
  NotasNVARCHAR(1000) NULL,
  IdPedido INT   NULL
);
IF OBJECT_ID('dbo.C_CotizacionDetalle', 'U') IS NULL
CREATE TABLE dbo.C_CotizacionDetalle (
  IdDetalle INT IDENTITY(1,1) PRIMARY KEY,
  IdCotizacion  INT NOT NULL REFERENCES dbo.C_Cotizaciones(IdCotizacion) ON DELETE CASCADE,
  NombreNVARCHAR(300) NOT NULL,
  Link  NVARCHAR(600) NULL,
  Foto  NVARCHAR(MAX) NULL,
  Sku   NVARCHAR(100) NULL,
  TallaColorNVARCHAR(150) NULL,
  PrecioUSD DECIMAL(18,2) NOT NULL DEFAULT 0,
  Cantidad  INT   NOT NULL DEFAULT 1,
  PesoLbDECIMAL(18,3) NOT NULL DEFAULT 0,
  IdArticuloINT   NULL,
  PrecioFinalL  DECIMAL(18,2) NOT NULL DEFAULT 0
);
  
