const scrapingService = require("../services/scrapingService");
exports.createProduct = async (req, res) => {
  const { url } = req.body;

  try {
    const produto = await scrapingService.pegarProduto(url);

    res.json(produto);
  } catch (error) {
    res.status(500).json({
      error: "Erro ao fazer scraping"
    });
  }
};