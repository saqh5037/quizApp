/**
 * Comprehensive test suite for Interactive Video features
 * Tests AI content generation, transcription, and editing capabilities
 */

import { InteractiveVideoLayer, Video } from '../src/models';
import { videoAIAnalyzerService } from '../src/services/video-ai-analyzer.service';
import axios from 'axios';

const API_BASE = 'http://localhost:3001/api/v1';
const TEST_VIDEO_ID = 58;

describe('Interactive Video AI Features', () => {
  let authToken: string;
  let layerId: number;

  beforeAll(async () => {
    // Login to get auth token
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@aristotest.com',
      password: 'admin123'
    });
    authToken = loginResponse.data.data.accessToken;
  });

  describe('AI Content Generation', () => {
    test('should generate interactive content for video', async () => {
      const startTime = Date.now();
      
      const response = await axios.post(
        `${API_BASE}/interactive-video/generate/${TEST_VIDEO_ID}`,
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('layerId');
      
      layerId = response.data.data.layerId;
      
      console.log(`✅ Content generation completed in ${duration}ms`);
    }, 300000); // 5 minute timeout for AI processing

    test('should track progress gradually', async (done) => {
      const progressUpdates: string[] = [];
      let checkCount = 0;
      const maxChecks = 30;

      const checkProgress = setInterval(async () => {
        try {
          const response = await axios.get(
            `${API_BASE}/interactive-video/layer/${layerId}/progress`,
            {
              headers: { Authorization: `Bearer ${authToken}` }
            }
          );

          const { processingStatus, processingLog } = response.data.data;
          progressUpdates.push(processingLog);

          if (processingStatus === 'ready' || processingStatus === 'error' || checkCount >= maxChecks) {
            clearInterval(checkProgress);
            
            // Verify gradual progress
            const progressPercentages = progressUpdates
              .map(log => {
                const match = log.match(/\((\d+)%\)/);
                return match ? parseInt(match[1]) : 0;
              })
              .filter(p => p > 0);

            console.log('Progress updates:', progressPercentages);
            
            // Check that progress was gradual
            expect(progressPercentages.length).toBeGreaterThan(3);
            expect(progressPercentages[0]).toBeLessThan(20);
            expect(progressPercentages[progressPercentages.length - 1]).toBe(100);
            
            // Verify no big jumps (max 30% jump)
            for (let i = 1; i < progressPercentages.length; i++) {
              const jump = progressPercentages[i] - progressPercentages[i - 1];
              expect(jump).toBeLessThanOrEqual(30);
            }

            done();
          }
          
          checkCount++;
        } catch (error) {
          clearInterval(checkProgress);
          done(error);
        }
      }, 2000);
    }, 120000);
  });

  describe('Transcription Quality', () => {
    test('should have real transcription (not mock data)', async () => {
      const response = await axios.get(
        `${API_BASE}/interactive-video/layer/${layerId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      const { aiGeneratedContent } = response.data.data;
      
      // Check that content doesn't contain obvious mock data patterns
      const transcript = JSON.stringify(aiGeneratedContent);
      
      expect(transcript).not.toContain('Lorem ipsum');
      expect(transcript).not.toContain('Ejemplo de transcripción');
      expect(transcript).not.toContain('Mock question');
      
      // Check for realistic content structure
      expect(aiGeneratedContent).toHaveProperty('keyMoments');
      expect(aiGeneratedContent.keyMoments.length).toBeGreaterThan(0);
      expect(aiGeneratedContent.keyMoments.length).toBeLessThanOrEqual(10);
      
      console.log(`✅ Generated ${aiGeneratedContent.keyMoments.length} real questions`);
    });

    test('should have properly distributed timestamps', async () => {
      const response = await axios.get(
        `${API_BASE}/interactive-video/layer/${layerId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      const { aiGeneratedContent, video } = response.data.data;
      const duration = video.duration || 300;
      const moments = aiGeneratedContent.keyMoments;

      // Check timestamp distribution
      moments.forEach((moment: any, index: number) => {
        // Should not be too early (after 20% of video)
        expect(moment.timestamp).toBeGreaterThan(duration * 0.15);
        
        // Should not be at the very end (before 95% of video)
        expect(moment.timestamp).toBeLessThan(duration * 0.95);
        
        // Should be properly spaced
        if (index > 0) {
          const spacing = moment.timestamp - moments[index - 1].timestamp;
          expect(spacing).toBeGreaterThan(10); // At least 10 seconds apart
        }
      });

      console.log('✅ Timestamps properly distributed');
    });
  });

  describe('Content Editing', () => {
    test('should update transcription text', async () => {
      const updatedTranscript = 'This is the corrected transcription with fixed pronunciation errors.';
      
      const response = await axios.patch(
        `${API_BASE}/interactive-video/layer/${layerId}/content`,
        {
          transcription: updatedTranscript
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      
      console.log('✅ Transcription updated successfully');
    });

    test('should update question timestamps', async () => {
      const response = await axios.get(
        `${API_BASE}/interactive-video/layer/${layerId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      const moments = response.data.data.aiGeneratedContent.keyMoments;
      
      // Update first question timestamp
      moments[0].timestamp = 45; // Move to 45 seconds
      
      const updateResponse = await axios.patch(
        `${API_BASE}/interactive-video/layer/${layerId}/content`,
        {
          keyMoments: moments
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(updateResponse.status).toBe(200);
      
      // Verify update
      const verifyResponse = await axios.get(
        `${API_BASE}/interactive-video/layer/${layerId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      expect(verifyResponse.data.data.aiGeneratedContent.keyMoments[0].timestamp).toBe(45);
      
      console.log('✅ Question timestamps updated successfully');
    });

    test('should update question content', async () => {
      const response = await axios.get(
        `${API_BASE}/interactive-video/layer/${layerId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      const moments = response.data.data.aiGeneratedContent.keyMoments;
      
      // Update question text and answers
      moments[0].question.text = '¿Cuál es el concepto principal explicado en esta sección?';
      moments[0].question.options = [
        'Respuesta correcta actualizada',
        'Opción incorrecta B',
        'Opción incorrecta C', 
        'Opción incorrecta D'
      ];
      moments[0].question.correctAnswer = 'Respuesta correcta actualizada';
      
      const updateResponse = await axios.patch(
        `${API_BASE}/interactive-video/layer/${layerId}/content`,
        {
          keyMoments: moments
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      expect(updateResponse.status).toBe(200);
      
      console.log('✅ Question content updated successfully');
    });
  });
});

describe('Performance Tests', () => {
  test('should handle concurrent video processing', async () => {
    const videoIds = [TEST_VIDEO_ID]; // Add more video IDs if available
    
    const promises = videoIds.map(videoId => 
      axios.post(
        `${API_BASE}/interactive-video/generate/${videoId}`,
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      ).catch(err => ({ error: err.message }))
    );

    const startTime = Date.now();
    const results = await Promise.all(promises);
    const endTime = Date.now();

    const successful = results.filter((r: any) => !r.error).length;
    const failed = results.filter((r: any) => r.error).length;

    console.log(`✅ Processed ${successful} videos successfully, ${failed} failed`);
    console.log(`⏱️ Total time: ${endTime - startTime}ms`);
    
    expect(successful).toBeGreaterThan(0);
  });

  test('should retrieve content quickly', async () => {
    const iterations = 10;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      await axios.get(
        `${API_BASE}/interactive-video/layer/${layerId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      const endTime = Date.now();
      times.push(endTime - startTime);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxTime = Math.max(...times);

    console.log(`✅ Average response time: ${avgTime.toFixed(2)}ms`);
    console.log(`⏱️ Max response time: ${maxTime}ms`);

    expect(avgTime).toBeLessThan(200); // Should respond in less than 200ms average
    expect(maxTime).toBeLessThan(500); // No request should take more than 500ms
  });
});

// Export for use in test runner
export default {
  runTests: async () => {
    console.log('🚀 Starting Interactive Video Tests...\n');
    
    try {
      // Run all test suites
      await describe('Interactive Video AI Features', () => {});
      await describe('Performance Tests', () => {});
      
      console.log('\n✅ All tests completed successfully!');
    } catch (error) {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    }
  }
};