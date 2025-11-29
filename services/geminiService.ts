import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GradeLevel, Question } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const questionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING, description: "Nội dung câu hỏi toán học ngắn gọn" },
          answer: { type: Type.STRING, description: "Đáp án ngắn gọn (số hoặc từ ngữ ngắn)" }
        },
        required: ["text", "answer"]
      }
    }
  }
};

export const generateQuestionsByTopic = async (grade: GradeLevel, topic: string): Promise<Question[]> => {
  try {
    const prompt = `
      Bạn là một giáo viên Toán tại trường THCS Đa Kia, chuyên gia về bộ sách "Chân trời sáng tạo".
      Hãy tạo ra 15 câu hỏi bài tập trả lời ngắn (điền vào chỗ trống) cho học sinh ${grade}.
      Chủ đề: ${topic}.
      Yêu cầu:
      1. Câu hỏi bám sát nội dung sách giáo khoa Chân trời sáng tạo.
      2. Câu trả lời phải ngắn gọn, chính xác (ví dụ: một con số, một công thức, hoặc một cụm từ).
      3. Độ khó phù hợp với lứa tuổi 12-15.
      4. Trả về đúng định dạng JSON.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: questionSchema,
        systemInstruction: "Bạn là trợ lý giáo dục môn Toán, chuyên tạo đề thi trắc nghiệm điền khuyết.",
      },
    });

    const data = JSON.parse(response.text || "{ \"questions\": [] }");
    
    return data.questions.map((q: any, index: number) => ({
      id: index + 1,
      text: q.text,
      correctAnswer: q.answer,
      userAnswer: ""
    }));

  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("Không thể tạo câu hỏi từ AI. Vui lòng thử lại.");
  }
};

export const generateQuestionsFromImage = async (base64Image: string, instructions: string): Promise<Question[]> => {
  try {
    const prompt = `
      Dựa trên hình ảnh tài liệu được cung cấp và hướng dẫn bổ sung: "${instructions}".
      Hãy trích xuất hoặc sáng tạo 15 câu hỏi toán học trả lời ngắn phù hợp với trình độ THCS (Lớp 6-9).
      Nếu hình ảnh là một đề bài, hãy giải và đưa ra đáp án đúng cho tôi kiểm tra, nhưng format trả về vẫn là câu hỏi và đáp án.
      Nếu hình ảnh là lý thuyết, hãy tạo câu hỏi ôn tập dựa trên lý thuyết đó.
      Bộ sách tham khảo: Chân trời sáng tạo.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: questionSchema,
      },
    });

    const data = JSON.parse(response.text || "{ \"questions\": [] }");

    return data.questions.map((q: any, index: number) => ({
      id: index + 1,
      text: q.text,
      correctAnswer: q.answer,
      userAnswer: ""
    }));

  } catch (error) {
    console.error("Gemini Vision Error:", error);
    throw new Error("Không thể xử lý hình ảnh. Vui lòng thử lại.");
  }
};