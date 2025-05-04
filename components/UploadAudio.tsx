'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast"
import { Loader2, X, Mic, FileAudio, MessageSquare, PieChart } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import axios from 'axios';

interface Team {
  id: string;
  name: string;
}

interface MonitoredFile {
  name: string;
  size: number;
  lastModified: string;
}

// Define the possible processing steps
type ProcessingStep = 'idle' | 'transcribing' | 'generating-summary' | 'generating-topics' | 'completed';

const UploadAudio: React.FC<{ onUploadSuccess: () => void }> = ({ onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [processingStep, setProcessingStep] = useState<ProcessingStep>('idle');
  const [compressedFile, setCompressedFile] = useState<File | null>(null);
  const [monitoredFiles, setMonitoredFiles] = useState<MonitoredFile[]>([]);
  const [ffmpeg, setFfmpeg] = useState<any>(null);
  const [isFFmpegLoading, setIsFFmpegLoading] = useState(true);
  const [isFFmpegLoaded, setIsFFmpegLoaded] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("none");
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);
  const { toast } = useToast();

  // Helper function to get step details
  const getStepDetails = (step: ProcessingStep): { icon: React.ReactNode; text: string } => {
    switch (step) {
      case 'transcribing':
        return {
          icon: <FileAudio className="w-4 h-4 mr-2" />,
          text: 'Transcribing Audio...'
        };
      case 'generating-summary':
        return {
          icon: <MessageSquare className="w-4 h-4 mr-2" />,
          text: 'Generating Summary...'
        };
      case 'generating-topics':
        return {
          icon: <PieChart className="w-4 h-4 mr-2" />,
          text: 'Generating Topic Segmentation...'
        };
      case 'completed':
        return {
          icon: <Mic className="w-4 h-4 mr-2" />,
          text: 'Processing Complete'
        };
      default:
        return {
          icon: <Mic className="w-4 h-4 mr-2" />,
          text: 'Transcribe Audio'
        };
    }
  };

  useEffect(() => {
    const initFfmpeg = async () => {
      try {
        if (typeof window !== 'undefined') {
          const { FFmpeg } = await import('@ffmpeg/ffmpeg');
          const ffmpegInstance = new FFmpeg();
          await ffmpegInstance.load();
          setFfmpeg(ffmpegInstance);
          setIsFFmpegLoaded(true);
          toast({
            title: 'Ready',
            description: 'Audio compression is now available.',
          });
        }
      } catch (err) {
        console.error('Failed to initialize FFmpeg:', err);
        toast({
          title: 'Error',
          description: 'Failed to initialize audio compression. Some features may be limited.',
          variant: 'destructive',
        });
      } finally {
        setIsFFmpegLoading(false);
      }
    };
    
    if (typeof window !== 'undefined') {
      initFfmpeg();
    }
    
    // Fetch teams
    fetchTeams();
  }, [toast]);

  useEffect(() => {
    fetchMonitoredFiles();
    const interval = setInterval(fetchMonitoredFiles, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);
  
  const fetchTeams = async () => {
    try {
      setIsLoadingTeams(true);
      const response = await axios.get('/api/teams');
      setTeams(response.data || []);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch teams.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingTeams(false);
    }
  };

  const fetchMonitoredFiles = async () => {
    try {
      const response = await fetch('/api/monitored-files');
      if (response.ok) {
        const files: MonitoredFile[] = await response.json();
        setMonitoredFiles(files);
      }
    } catch (error) {
      console.error('Error fetching monitored files:', error);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCompressedFile(null);
    }
  };

  const handleMonitoredFileSelect = async (fileName: string) => {
    try {
      const response = await fetch(`/api/monitored-files/${encodeURIComponent(fileName)}`);
      if (response.ok) {
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: blob.type });
        setSelectedFile(file);
        setCompressedFile(null);
      }
    } catch (error) {
      console.error('Error selecting monitored file:', error);
      toast({
        title: 'File Selection Failed',
        description: 'An error occurred while selecting the file.',
        variant: 'destructive',
      });
    }
  };

  const compressAudio = async () => {
    if (!selectedFile || !ffmpeg) return;
    setIsCompressing(true);
    try {
      // Make sure FFmpeg is loaded
      if (!isFFmpegLoaded) {
        await ffmpeg.load();
      }
      
      // Continue with compression
      const { fetchFile } = await import('@ffmpeg/util');
      await ffmpeg.writeFile('input_audio', await fetchFile(selectedFile));

      await ffmpeg.exec([
        '-i',
        'input_audio',
        '-ar',
        '16000',
        '-ac',
        '1',
        '-b:a',
        '16k',
        'output_audio.mp3'
      ]);

      const data = await ffmpeg.readFile('output_audio.mp3');
      const compressedBlob = new Blob([data], { type: 'audio/mpeg' });
      const compressed = new File([compressedBlob], `compressed_${selectedFile.name}`, {
        type: 'audio/mpeg',
      });

      setCompressedFile(compressed);
      toast({
        title: 'Compression Successful',
        description: `File size reduced to ${(compressed.size / (1024 * 1024)).toFixed(2)} MB`,
      });
    } catch (error) {
      console.error('Compression error:', error);
      toast({
        title: 'Compression Failed',
        description: 'An error occurred while compressing the audio.',
        variant: 'destructive',
      });
    } finally {
      setIsCompressing(false);
    }
  };

  const handleTranscribe = async () => {
    const fileToUpload = compressedFile || selectedFile;
    if (!fileToUpload) return;

    // Set initial step
    setProcessingStep('transcribing');
    
    const formData = new FormData();
    formData.append('audio', fileToUpload);
    formData.append('fullPath', fileToUpload.name);
    
    // Add team ID if selected (not "none" or empty)
    if (selectedTeamId && selectedTeamId !== "none") {
      formData.append('teamId', selectedTeamId);
    }

    try {
      // Simulate each step in the process (the real process happens on the server)
      // Transcribing stage
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Start the actual API call
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Transcription failed with status: ${response.status}`);
      }
      
      // Simulate seeing the summarizing stage
      setProcessingStep('generating-summary');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate seeing the topic segmentation stage
      setProcessingStep('generating-topics');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Complete
      setProcessingStep('completed');
      
      toast({
        title: 'Processing Complete',
        description: selectedTeamId !== "none"
          ? 'Your audio has been transcribed and analyzed. Results are shared with the team.'
          : 'Your audio has been transcribed and analyzed.',
      });
      
      // Wait a brief moment before resetting and refreshing
      setTimeout(() => {
        onUploadSuccess();
        setProcessingStep('idle');
        setSelectedFile(null);
        setCompressedFile(null);
        setSelectedTeamId("none");
      }, 1500);
      
    } catch (error) {
      console.error('Transcription error:', error);
      toast({
        title: 'Processing Failed',
        description: 'An error occurred while processing the audio.',
        variant: 'destructive',
      });
      setProcessingStep('idle');
    }
  };

  const getFileSizeMB = (file: File | null): number => {
    return file ? file.size / (1024 ** 2) : 0;
  };

  const isCompressionNeeded = selectedFile && getFileSizeMB(selectedFile) > 24;
  const isCompressionDisabled = !ffmpeg || !isFFmpegLoaded || !selectedFile || isCompressing;
  const isProcessing = processingStep !== 'idle';
  const isTranscribeDisabled =
    !selectedFile ||
    (isCompressionNeeded && !compressedFile) ||
    (compressedFile && getFileSizeMB(compressedFile) > 24) ||
    isCompressing ||
    isProcessing;

  // Get the current step details
  const stepDetails = getStepDetails(processingStep);

  return (
    <Card className="shadow-contrast-dark border-border/50 overflow-hidden">
      <CardHeader className="bg-black/40 backdrop-blur-sm">
        <CardTitle className="font-display text-xl flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Mic className="w-4 h-4 text-primary" />
          </div>
          Upload New Audio
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {isFFmpegLoading ? (
            <div className="flex items-center gap-2 text-blue-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Initializing audio compression...</span>
            </div>
          ) : isFFmpegLoaded ? (
            "Select an audio file to transcribe. Audio compression is available for large files."
          ) : (
            "Select an audio file to transcribe. Audio compression is not available."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="flex flex-col gap-4">
          <Label htmlFor="audio-file" className="font-display text-sm">Audio File</Label>
          <div className="relative w-full h-auto overflow-hidden rounded-md border border-border/50 bg-background">
            <Input
              id="audio-file"
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="w-full cursor-pointer h-full p-2 overflow-hidden text-sm 
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-display
                file:bg-primary/10 file:text-primary
                hover:file:bg-primary/20 file:transition-soft
                file:cursor-pointer"
            />
          </div>
          {selectedFile && (
            <p className="text-sm text-muted-foreground">Selected File: <span className="text-foreground">{selectedFile.name}</span> <span className="text-primary">({getFileSizeMB(selectedFile).toFixed(2)} MB)</span></p>
          )}
          
          <div className="space-y-3">
            <Label htmlFor="team-select" className="font-display text-sm">Share with Team (Optional)</Label>
            <Select
              value={selectedTeamId}
              onValueChange={(value) => setSelectedTeamId(value)}
            >
              <SelectTrigger id="team-select" disabled={isLoadingTeams} className="border-border/50 bg-black/20">
                <SelectValue placeholder="Select a team (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Personal Meeting (Not shared)</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {selectedTeamId && selectedTeamId !== "none" 
                ? "This meeting will be shared with all members of the selected team." 
                : "This meeting will be private to you."}
            </p>
          </div>
          
          {monitoredFiles.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Monitored Files:</h3>
              <ul className="space-y-2">
                {monitoredFiles.map((file) => (
                  <li key={file.name} className="flex items-center justify-between">
                    <span>{file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                    <Button onClick={() => handleMonitoredFileSelect(file.name)}>Select</Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {isCompressionNeeded && !compressedFile && (
            <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/10">
              <p className="text-amber-300 mb-2">File size is large ({getFileSizeMB(selectedFile).toFixed(2)} MB)</p>
              <Button
                onClick={compressAudio}
                disabled={isCompressionDisabled}
                variant="outline"
                className="font-display text-sm border-amber-500/30 text-amber-300 hover:bg-amber-500/20 flex items-center gap-2"
              >
                {isCompressing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <span className="w-4 h-4 mr-2">📦</span>
                )}
                {isCompressing ? 'Compressing...' : 'Compress Audio'}
              </Button>
            </div>
          )}

          {compressedFile && (
            <p className="text-sm text-muted-foreground">Compressed File: <span className="text-foreground">{compressedFile.name}</span> <span className="text-emerald-400">({getFileSizeMB(compressedFile).toFixed(2)} MB)</span></p>
          )}
          
          <div className="flex flex-col space-y-4 mt-4">
            <div className="w-full border-t border-border/20 pt-4"></div>
            
            {isProcessing && (
              <div className="mb-2">
                <div className="flex space-x-2 mb-2">
                  <div className={`h-2 rounded-full flex-1 ${processingStep === 'transcribing' ? 'bg-blue-500' : processingStep !== 'idle' ? 'bg-green-500' : 'bg-gray-700'}`}></div>
                  <div className={`h-2 rounded-full flex-1 ${processingStep === 'generating-summary' ? 'bg-blue-500' : (processingStep === 'generating-topics' || processingStep === 'completed') ? 'bg-green-500' : 'bg-gray-700'}`}></div>
                  <div className={`h-2 rounded-full flex-1 ${processingStep === 'generating-topics' ? 'bg-blue-500' : processingStep === 'completed' ? 'bg-green-500' : 'bg-gray-700'}`}></div>
                </div>
              </div>
            )}
            
            <Button 
              onClick={handleTranscribe} 
              disabled={isTranscribeDisabled}
              className={`font-display text-sm px-6 py-5 h-auto transition-soft shadow-contrast-dark flex items-center gap-2 
                ${isProcessing ? 'opacity-80' : 'hover:scale-105'} 
                ${isTranscribeDisabled ? 'opacity-50' : ''}`}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                stepDetails.icon
              )}
              {stepDetails.text}
            </Button>
            
            {isTranscribeDisabled && selectedFile && getFileSizeMB(selectedFile) > 24 && !compressedFile && (
              <p className="text-sm text-red-400 italic">
                File size exceeds 24 MB, please compress the file before transcribing.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UploadAudio;
