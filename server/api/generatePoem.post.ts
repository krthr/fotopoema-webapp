import { getRandomAuthors } from "../services/Authors";
import { createCompletion } from "../services/OpenAi";
import { annotateImage } from "../services/Vision";
import { processImage } from "../utils/image";
import { GeneratePoemSchema } from "../validators/GeneratePoem";

const MODES: Record<string, string> = {
  erotic: "An erotic",
  romantic: "A romantic",
};

interface Color {
  color: string;
  fraction: string;
}

export interface Poem {
  author: string;
  colors: Color[];
  image: string;
  generatedAt: Date;
  generatedAtLabel: string;
  keywords: string[];
  poem: string;
  signature: string;
}

export default defineEventHandler<Poem>(async (event) => {
  const body = await readBody(event);
  const { mode } = getQuery(event);

  const parse = await GeneratePoemSchema.safeParseAsync(body);
  if (!parse.success) {
    throw createError({
      statusCode: 400,
      statusMessage: "No se recibió imagen. Inténtalo nuevamente.",
    });
  }

  const processedImage = await processImage(parse.data.image);
  if (!processedImage) {
    throw createError({
      statusCode: 400,
      statusMessage: "Error al leer la imagen.",
    });
  }

  const annotations = await annotateImage(processedImage.buffer);
  if (!annotations) {
    throw createError({
      statusCode: 422,
      statusMessage: "Error al procesar la imagen. Intenta usar otra.",
    });
  }

  const { labels, objects, colors } = annotations;
  const keywords = Array.from(new Set([...labels, ...objects])).map((keyword) =>
    keyword.trim().toLowerCase()
  );

  const author = getRandomAuthors();
  const poemPrompt: string[] = [];

  if (typeof mode === "string" && mode in MODES) {
    poemPrompt.push(MODES[mode]);
  } else {
    poemPrompt.push("A");
  }

  poemPrompt.push(`poem in Spanish written by ${author} inspired by:`);
  poemPrompt.push(keywords.join(", "));
  poemPrompt.push("\n");

  const poem = await createCompletion(poemPrompt.join(" "), {
    temperature: 0.8,
    max_tokens: 300 + poemPrompt.length,
  });

  if (!poem) {
    throw createError({
      statusCode: 422,
      statusMessage:
        "No se ha generado ningún poema. Intenta usando otra imagne.",
    });
  }

  const generatedAt = new Date();
  const generatedAtLabel = Intl.DateTimeFormat("es", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(generatedAt);

  const data = {
    author,
    colors,
    image: processedImage.base64,
    generatedAt,
    generatedAtLabel,
    keywords,
    poem,
  };

  const signature = generateSignature(data);

  return {
    ...data,
    signature,
  };
});