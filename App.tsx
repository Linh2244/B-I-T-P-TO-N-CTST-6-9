import React, { useState, useCallback } from 'react';
import { BookOpen, PenTool, Upload, Layout, Award, ArrowLeft, PlusCircle } from 'lucide-react';
import { GradeLevel, AppMode, Quiz, Question, QuizResult } from './types';
import { generateQuestionsByTopic, generateQuestionsFromImage } from './services/geminiService';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function App() {
  const [mode, setMode] = useState<AppMode>('HOME');
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // States for creators
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(GradeLevel.Grade6);
  const [topic, setTopic] = useState('');
  const [manualQuestions, setManualQuestions] = useState<Question[]>([]);
  
  // Navigation Handler
  const goHome = () => {
    setMode('HOME');
    setError(null);
    setLoading(false);
    setManualQuestions([]);
    setTopic('');
  };

  // 3.1 & 3.3 AI Creator Logic
  const handleAICreate = async () => {
    if (!topic.trim()) {
      setError("Vui lòng nhập chủ đề.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const questions = await generateQuestionsByTopic(selectedGrade, topic);
      const newQuiz: Quiz = {
        title: `Bài tập: ${topic}`,
        grade: selectedGrade,
        questions,
        createdAt: Date.now(),
      };
      setCurrentQuiz(newQuiz);
      setMode('TAKING_QUIZ');
    } catch (err: any) {
      setError(err.message || "Lỗi khi tạo câu hỏi.");
    } finally {
      setLoading(false);
    }
  };

  // 3.2 Manual Input Logic
  const handleAddManualQuestion = () => {
    const newId = manualQuestions.length + 1;
    if (newId > 15) return;
    setManualQuestions([...manualQuestions, { id: newId, text: '', correctAnswer: '' }]);
  };

  const updateManualQuestion = (id: number, field: 'text' | 'correctAnswer', value: string) => {
    setManualQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const finishManualCreate = () => {
    if (manualQuestions.length === 0) {
        setError("Hãy thêm ít nhất một câu hỏi.");
        return;
    }
    const validQuestions = manualQuestions.filter(q => q.text.trim() && q.correctAnswer.trim());
    if (validQuestions.length < manualQuestions.length) {
      setError("Vui lòng điền đầy đủ câu hỏi và đáp án cho các dòng đã tạo.");
      return;
    }
    
    const newQuiz: Quiz = {
      title: "Bài tập tự nhập",
      grade: selectedGrade,
      questions: validQuestions,
      createdAt: Date.now()
    };
    setCurrentQuiz(newQuiz);
    setMode('TAKING_QUIZ');
  };

  // 3.3 File Upload Logic (Image)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert file to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1]; // Remove data url prefix
      
      setLoading(true);
      setError(null);
      try {
        const questions = await generateQuestionsFromImage(base64Data, topic || "Tạo câu hỏi từ tài liệu này");
        const newQuiz: Quiz = {
            title: `Bài tập từ tệp tải lên`,
            grade: selectedGrade,
            questions,
            createdAt: Date.now(),
          };
          setCurrentQuiz(newQuiz);
          setMode('TAKING_QUIZ');
      } catch (err: any) {
        setError(err.message || "Lỗi xử lý tệp.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // 3.4 Taking Quiz Logic
  const handleAnswerChange = (qId: number, val: string) => {
    if (!currentQuiz) return;
    const updatedQuestions = currentQuiz.questions.map(q => 
      q.id === qId ? { ...q, userAnswer: val } : q
    );
    setCurrentQuiz({ ...currentQuiz, questions: updatedQuestions });
  };

  const submitQuiz = () => {
    if (!currentQuiz) return;
    let correct = 0;
    currentQuiz.questions.forEach(q => {
      // Simple case-insensitive comparison, trimming whitespace
      if (q.userAnswer?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) {
        correct++;
      }
    });
    
    // Scale score to 10
    const total = currentQuiz.questions.length;
    const score = total === 0 ? 0 : Number(((correct / total) * 10).toFixed(1));

    setQuizResult({
      totalQuestions: total,
      correctCount: correct,
      score,
      quizData: currentQuiz
    });
    setMode('RESULTS');
  };

  // --- RENDER SECTIONS ---

  const renderHome = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mt-10 p-4">
      <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center mb-8">
        <h1 className="text-4xl font-bold text-blue-900 mb-2">Trường THCS Đa Kia</h1>
        <p className="text-gray-600 text-lg">Ứng dụng hỗ trợ học tập môn Toán (Chân trời sáng tạo)</p>
      </div>

      <div 
        onClick={() => setMode('AI_CREATE')}
        className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-t-4 border-blue-500 flex flex-col items-center group"
      >
        <div className="p-4 bg-blue-100 rounded-full mb-4 group-hover:bg-blue-200 transition-colors">
            <Layout size={32} className="text-blue-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-800">3.1 AI Tạo Đề</h3>
        <p className="text-gray-500 text-center mt-2">Nhập chủ đề, AI sẽ tạo bộ 15 câu hỏi tự động.</p>
      </div>

      <div 
        onClick={() => setMode('MANUAL_CREATE')}
        className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-t-4 border-indigo-500 flex flex-col items-center group"
      >
        <div className="p-4 bg-indigo-100 rounded-full mb-4 group-hover:bg-indigo-200 transition-colors">
            <PenTool size={32} className="text-indigo-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-800">3.2 Tự Nhập Đề</h3>
        <p className="text-gray-500 text-center mt-2">Giáo viên tự soạn câu hỏi và đáp án cho học sinh.</p>
      </div>

      <div 
        onClick={() => setMode('FILE_UPLOAD')}
        className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer border-t-4 border-green-500 flex flex-col items-center group"
      >
         <div className="p-4 bg-green-100 rounded-full mb-4 group-hover:bg-green-200 transition-colors">
            <Upload size={32} className="text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-800">3.3 Tải Nội Dung</h3>
        <p className="text-gray-500 text-center mt-2">Tải ảnh/tài liệu lên để AI phân tích và tạo đề.</p>
      </div>
    </div>
  );

  const renderAICreate = () => (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md mt-10">
       <button onClick={goHome} className="flex items-center text-gray-500 hover:text-blue-600 mb-6">
        <ArrowLeft size={20} className="mr-2" /> Quay lại
      </button>
      <h2 className="text-2xl font-bold mb-6 text-gray-800">AI Tạo Đề Theo Chủ Đề</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chọn Khối Lớp</label>
          <select 
            value={selectedGrade} 
            onChange={(e) => setSelectedGrade(e.target.value as GradeLevel)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
          >
            {Object.values(GradeLevel).map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <Input 
          label="Chủ đề bài học (Ví dụ: Số nguyên, Hình học phẳng...)" 
          placeholder="Nhập tên bài hoặc chủ đề trong sách Chân trời sáng tạo..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <Button onClick={handleAICreate} loading={loading} className="w-full">
            Tạo Đề Ngay
        </Button>
      </div>
    </div>
  );

  const renderManualCreate = () => (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-md mt-10">
      <div className="flex justify-between items-center mb-6">
        <button onClick={goHome} className="flex items-center text-gray-500 hover:text-blue-600">
            <ArrowLeft size={20} className="mr-2" /> Quay lại
        </button>
        <h2 className="text-2xl font-bold text-gray-800">Tự Nhập Câu Hỏi</h2>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4">
         <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Khối Lớp</label>
          <select 
            value={selectedGrade} 
            onChange={(e) => setSelectedGrade(e.target.value as GradeLevel)}
            className="w-full rounded-md border-gray-300 shadow-sm border p-2"
          >
            {Object.values(GradeLevel).map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-6">
        {manualQuestions.map((q, idx) => (
            <div key={q.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex justify-between mb-2">
                    <span className="font-semibold text-gray-700">Câu hỏi {idx + 1}</span>
                </div>
                <div className="space-y-3">
                    <Input 
                        placeholder="Nội dung câu hỏi..." 
                        value={q.text}
                        onChange={(e) => updateManualQuestion(q.id, 'text', e.target.value)}
                    />
                    <Input 
                        placeholder="Đáp án đúng..." 
                        value={q.correctAnswer}
                        onChange={(e) => updateManualQuestion(q.id, 'correctAnswer', e.target.value)}
                    />
                </div>
            </div>
        ))}
      </div>

      {manualQuestions.length < 15 && (
         <button 
            onClick={handleAddManualQuestion}
            className="w-full mt-6 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-500 flex items-center justify-center transition-colors"
         >
            <PlusCircle size={20} className="mr-2" /> Thêm câu hỏi ({manualQuestions.length}/15)
         </button>
      )}

      <div className="mt-8 pt-4 border-t border-gray-200">
          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
          <Button onClick={finishManualCreate} className="w-full" disabled={manualQuestions.length === 0}>
              Hoàn Tất & Làm Bài
          </Button>
      </div>
    </div>
  );

  const renderFileUpload = () => (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md mt-10">
      <button onClick={goHome} className="flex items-center text-gray-500 hover:text-blue-600 mb-6">
        <ArrowLeft size={20} className="mr-2" /> Quay lại
      </button>
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Tải Nội Dung (Hình ảnh/Tài liệu)</h2>
      
      <div className="space-y-6">
        <div className="border-2 border-dashed border-blue-200 rounded-xl p-8 text-center hover:bg-blue-50 transition-colors relative">
            <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center">
                <Upload size={48} className="text-blue-400 mb-2" />
                <p className="text-lg font-medium text-gray-700">Nhấn để tải ảnh hoặc chụp ảnh</p>
                <p className="text-sm text-gray-500">Hỗ trợ JPG, PNG (Chụp đề bài hoặc nội dung sách)</p>
            </div>
        </div>

        <div>
             <Input 
                label="Ghi chú thêm (Tùy chọn)" 
                placeholder="Ví dụ: Chỉ lấy bài tập hình học..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
            />
        </div>

        {loading && (
             <div className="text-center py-4">
                 <p className="text-blue-600 font-medium animate-pulse">Đang phân tích tài liệu và tạo câu hỏi...</p>
             </div>
        )}
        {error && <p className="text-red-500 text-center">{error}</p>}
      </div>
    </div>
  );

  const renderQuiz = () => {
    if (!currentQuiz) return null;
    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6 sticky top-4 z-10 border-b-4 border-blue-600">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{currentQuiz.title}</h2>
                        <p className="text-gray-500">{currentQuiz.grade} - {currentQuiz.questions.length} Câu hỏi</p>
                    </div>
                    <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg font-bold">
                        Đang làm bài
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {currentQuiz.questions.map((q, idx) => (
                    <div key={q.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex items-start mb-4">
                            <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 flex-shrink-0">
                                {idx + 1}
                            </span>
                            <p className="text-lg text-gray-800 pt-1">{q.text}</p>
                        </div>
                        <div className="ml-11">
                            <input
                                type="text"
                                className="w-full md:w-1/2 p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                placeholder="Nhập câu trả lời của bạn..."
                                value={q.userAnswer}
                                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8 flex justify-end pb-10">
                <Button onClick={submitQuiz} size="lg" className="shadow-xl">
                    Nộp Bài & Xem Kết Quả
                </Button>
            </div>
        </div>
    );
  };

  const renderResults = () => {
    if (!quizResult) return null;

    const data = [
        { name: 'Đúng', value: quizResult.correctCount, fill: '#16a34a' },
        { name: 'Sai', value: quizResult.totalQuestions - quizResult.correctCount, fill: '#dc2626' },
    ];

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8">
             <button onClick={goHome} className="flex items-center text-gray-500 hover:text-blue-600 mb-6">
                <ArrowLeft size={20} className="mr-2" /> Về Trang Chủ
            </button>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Score Card */}
                <div className="lg:col-span-1 bg-white p-8 rounded-2xl shadow-lg text-center border-t-8 border-yellow-400">
                    <div className="flex justify-center mb-4">
                        <Award size={64} className="text-yellow-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">Kết Quả</h2>
                    <div className="text-6xl font-black text-blue-600 mb-4">{quizResult.score}/10</div>
                    <p className="text-gray-500 mb-6">
                        Bạn làm đúng <span className="font-bold text-green-600">{quizResult.correctCount}</span> trên <span className="font-bold">{quizResult.totalQuestions}</span> câu.
                    </p>
                    
                    <div className="h-64 w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip />
                                <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Review Section */}
                <div className="lg:col-span-2 bg-white p-8 rounded-2xl shadow-lg">
                    <h3 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Chi tiết bài làm</h3>
                    <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
                        {quizResult.quizData.questions.map((q, idx) => {
                             const isCorrect = q.userAnswer?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
                             return (
                                 <div key={q.id} className={`p-4 rounded-lg border-l-4 ${isCorrect ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'}`}>
                                     <div className="flex justify-between">
                                         <p className="font-medium text-gray-800">Câu {idx + 1}: {q.text}</p>
                                         {isCorrect ? 
                                            <span className="text-green-600 font-bold text-sm">Đúng</span> : 
                                            <span className="text-red-600 font-bold text-sm">Sai</span>
                                         }
                                     </div>
                                     <div className="mt-2 text-sm grid grid-cols-1 md:grid-cols-2 gap-2">
                                         <div>
                                             <span className="text-gray-500 block">Bạn trả lời:</span>
                                             <span className={`${isCorrect ? 'text-green-700' : 'text-red-700'} font-medium`}>
                                                 {q.userAnswer || "(Bỏ trống)"}
                                             </span>
                                         </div>
                                         <div>
                                             <span className="text-gray-500 block">Đáp án đúng:</span>
                                             <span className="text-blue-700 font-bold">{q.correctAnswer}</span>
                                         </div>
                                     </div>
                                 </div>
                             )
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-10">
      <header className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={goHome}>
                <BookOpen size={28} />
                <div>
                    <h1 className="text-lg font-bold leading-tight">THCS Đa Kia</h1>
                    <p className="text-xs text-blue-100">Áp Toán - Chân trời sáng tạo</p>
                </div>
            </div>
            {mode !== 'HOME' && (
                 <button onClick={goHome} className="text-sm bg-blue-700 px-3 py-1 rounded hover:bg-blue-800 transition">
                     Trang chủ
                 </button>
            )}
        </div>
      </header>

      <main>
        {mode === 'HOME' && renderHome()}
        {mode === 'AI_CREATE' && renderAICreate()}
        {mode === 'MANUAL_CREATE' && renderManualCreate()}
        {mode === 'FILE_UPLOAD' && renderFileUpload()}
        {mode === 'TAKING_QUIZ' && renderQuiz()}
        {mode === 'RESULTS' && renderResults()}
      </main>
      
      <footer className="mt-20 text-center text-gray-400 text-sm pb-6">
        <p>&copy; {new Date().getFullYear()} Trường THCS Đa Kia. Ứng dụng hỗ trợ học tập.</p>
      </footer>
    </div>
  );
}