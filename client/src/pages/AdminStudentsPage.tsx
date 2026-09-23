import React, { useEffect, useRef, useState } from 'react';
import { Users, UserPlus, Search, Upload, Trash2, CheckCircle2, X, Phone, Building, Image as ImageIcon } from 'lucide-react';
import { api } from '../services/api';
import { Student } from '../types';
import { VisionService } from '../services/visionService';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const AdminStudentsPage: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [blockFilter, setBlockFilter] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form Fields
  const [registerNumber, setRegisterNumber] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('AI & Data Science');
  const [year, setYear] = useState('III Year');
  const [sem, setSem] = useState('Sem 5');
  const [hostelBlock, setHostelBlock] = useState('Block A');
  const [roomNumber, setRoomNumber] = useState('');
  const [registeredFaceImage, setRegisteredFaceImage] = useState('');
  const [faceEmbedding, setFaceEmbedding] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  // File upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [faceEnrolled, setFaceEnrolled] = useState(false);
  const [fileName, setFileName] = useState<string>('');

  const fetchStudents = async () => {
    try {
      const res = await api.get('/admin/students', {
        params: { search, block: blockFilter },
      });
      if (res.data.success) {
        setStudents(res.data.students);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, blockFilter]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPG, PNG, WEBP).');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Str = event.target?.result as string;
      setRegisteredFaceImage(base64Str);

      // Extract facial landmarks from uploaded photo file
      const { faceDetected, landmarks } = await VisionService.extractLandmarksFromImage(base64Str);
      setFaceEmbedding(landmarks);
      setFaceEnrolled(true);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setRegisteredFaceImage('');
    setFaceEmbedding([]);
    setFaceEnrolled(false);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!registeredFaceImage) {
      setError('Please upload a student face photo file.');
      return;
    }

    try {
      const res = await api.post('/admin/students', {
        registerNumber: registerNumber.trim().toUpperCase(),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        department,
        year,
        sem,
        hostelBlock,
        roomNumber: roomNumber.trim(),
        registeredFaceImage,
        faceEmbedding,
      });

      if (res.data.success) {
        setShowModal(false);
        resetForm();
        fetchStudents();
      } else {
        setError(res.data.message || 'Failed to add student');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error adding student');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Deactivate student record?')) return;
    try {
      await api.delete(`/admin/students/${id}`);
      fetchStudents();
    } catch (err) {
      alert('Failed to deactivate student');
    }
  };

  const resetForm = () => {
    setRegisterNumber('');
    setName('');
    setEmail('');
    setPhone('');
    setDepartment('AI & Data Science');
    setYear('III Year');
    setSem('Sem 5');
    setHostelBlock('Block A');
    setRoomNumber('');
    setRegisteredFaceImage('');
    setFaceEmbedding([]);
    setFaceEnrolled(false);
    setFileName('');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading student registry..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-400" />
            <span>Student Registry & Biometric Enrollment</span>
          </h1>
          <p className="text-xs text-slate-400">Manage hostel student profiles and registered face photo files</p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Student</span>
        </button>
      </div>

      {/* Filter & Search Header */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search student by Name, Reg Number, Email, Mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder:text-slate-600 outline-none focus:border-sky-500"
          />
        </div>

        <select
          value={blockFilter}
          onChange={(e) => setBlockFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl py-2 px-3 outline-none focus:border-sky-500 w-full sm:w-48"
        >
          <option value="">All Hostel Blocks</option>
          <option value="Block A">Block A</option>
          <option value="Block B">Block B</option>
          <option value="Block C">Block C</option>
          <option value="Block D">Block D</option>
        </select>
      </div>

      {/* Student Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Photo</th>
                <th className="py-3 px-4">Reg Number</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Email & Mobile</th>
                <th className="py-3 px-4">Dept / Year / Sem</th>
                <th className="py-3 px-4">Hostel & Room</th>
                <th className="py-3 px-4">Biometric Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No student records found in registry. Click "Add New Student" to enroll.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student._id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      {student.registeredFaceImage ? (
                        <img
                          src={student.registeredFaceImage}
                          alt={student.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-sky-500/40 shadow-sm"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 font-bold text-sm">
                          {student.name.charAt(0)}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-sky-400">{student.registerNumber}</td>
                    <td className="py-3.5 px-4 font-semibold text-white">{student.name}</td>
                    <td className="py-3.5 px-4 text-slate-400 space-y-0.5">
                      <div>{student.email}</div>
                      {student.phone && <div className="text-[11px] text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3 text-slate-600" /> {student.phone}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div>{student.department}</div>
                      <div className="text-[11px] text-slate-400">{student.year} • {student.sem || 'Sem 1'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Building className="w-3.5 h-3.5 text-slate-500" />
                        <span>{student.hostelBlock}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">Room {student.roomNumber}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {student.hasFaceEmbedding ? (
                        <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-[11px] font-semibold flex items-center gap-1 w-fit">
                          <CheckCircle2 className="w-3 h-3" /> Photo File Saved
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full text-[11px] font-semibold w-fit">
                          Default Profile
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleDelete(student._id)}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors border border-rose-500/20"
                        title="Deactivate Student"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-xl w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-sky-400" />
                <span>Enroll New Student</span>
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">{error}</div>}

            <form onSubmit={handleAddStudent} className="space-y-4">
              {/* Personal Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Register Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 23ADS001"
                    value={registerNumber}
                    onChange={(e) => setRegisterNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white uppercase outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aravind Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="student@hostel.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Department, Year & Semester */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Department *</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-sky-500"
                  >
                    <option value="AI & Data Science">AI & Data Science</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Electronics & Comm.">Electronics & Comm.</option>
                    <option value="Electrical Engg.">Electrical Engg.</option>
                    <option value="Mechanical Engg.">Mechanical Engg.</option>
                    <option value="Information Tech.">Information Tech.</option>
                    <option value="Civil Engg.">Civil Engg.</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Year *</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-sky-500"
                  >
                    <option value="I Year">I Year</option>
                    <option value="II Year">II Year</option>
                    <option value="III Year">III Year</option>
                    <option value="IV Year">IV Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Semester (Sem) *</label>
                  <select
                    value={sem}
                    onChange={(e) => setSem(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-sky-500"
                  >
                    <option value="Sem 1">Sem 1</option>
                    <option value="Sem 2">Sem 2</option>
                    <option value="Sem 3">Sem 3</option>
                    <option value="Sem 4">Sem 4</option>
                    <option value="Sem 5">Sem 5</option>
                    <option value="Sem 6">Sem 6</option>
                    <option value="Sem 7">Sem 7</option>
                    <option value="Sem 8">Sem 8</option>
                  </select>
                </div>
              </div>

              {/* Hostel Block & Room */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Hostel Block *</label>
                  <select
                    value={hostelBlock}
                    onChange={(e) => setHostelBlock(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white outline-none focus:border-sky-500"
                  >
                    <option value="Block A">Block A</option>
                    <option value="Block B">Block B</option>
                    <option value="Block C">Block C</option>
                    <option value="Block D">Block D</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Room Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 101"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-white outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Upload Face Photo File Section */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-sky-400" />
                    <span>Upload Face Photo File *</span>
                  </span>
                  {faceEnrolled && (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Photo Loaded & Stored in DB
                    </span>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {registeredFaceImage ? (
                  <div className="flex items-center gap-4 bg-slate-900 p-3 rounded-2xl border border-slate-800">
                    <img
                      src={registeredFaceImage}
                      alt="Uploaded Student Face"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-sky-500/50 shadow-md"
                    />
                    <div className="flex-1 space-y-1">
                      <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> Photo Attached
                      </p>
                      {fileName && <p className="text-[11px] text-slate-300 font-mono truncate max-w-xs">{fileName}</p>}
                      <p className="text-[11px] text-slate-400">Photo will be stored directly in database for verification.</p>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="text-[11px] text-rose-400 hover:text-rose-300 font-medium underline pt-1"
                      >
                        Remove / Select Different Image File
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-800 hover:border-sky-500/60 bg-slate-900/50 hover:bg-slate-900 transition-all rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer group text-center space-y-2"
                  >
                    <div className="w-12 h-12 rounded-full bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200 group-hover:text-sky-400 transition-colors">
                        Click to Choose Student Photo File
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Supports JPG, PNG, WEBP formats</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit / Cancel */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-semibold border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-sky-600 hover:bg-sky-500 text-white py-2.5 rounded-xl text-xs font-bold shadow-md shadow-sky-600/30"
                >
                  Save Student Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
