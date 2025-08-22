import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";

const chatPropmt = ChatPromptTemplate.fromTemplate(`
   Please act as a professional summary assistant. My task is to summarize a clear and accurate answer based on the user's input and execution results.
Please ensure that the summary meets the user's expectations and does not contain any errors or incomplete information.
Please summarize a clear and accurate answer based on the user's input and execution results.
User input: {input}
Execution result: {pastSteps}, where each step represents a corresponding task and its result.
Please summarize use markdown format a clear and accurate answer based on the user's input and execution results.
`);
const summaryChain = chatPropmt.pipe(new ChatOpenAI({ model: "gpt-4o" }));
export async function execSummary({
  input,
  pastSteps,
}: {
  input: string;
  pastSteps: string;
}) {
  const summary = await summaryChain.invoke({
    input,
    pastSteps,
  });
  return summary;
}
