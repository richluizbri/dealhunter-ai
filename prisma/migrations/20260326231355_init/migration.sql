CREATE TABLE `Product` (
    `id`        INTEGER       NOT NULL AUTO_INCREMENT,
    `titulo`    VARCHAR(500)  NOT NULL,
    `precoUSD`  DOUBLE        NOT NULL,
    `precoBRL`  DOUBLE        NOT NULL,
    `imagem`    VARCHAR(1000) NULL,         -- nullable: nem todo produto tem imagem
    `url`       VARCHAR(1000) NULL,         -- URL da página do produto
    `rating`    VARCHAR(50)   NULL,         -- avaliação ex: "4.5 / 5"
    `createdAt` DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;