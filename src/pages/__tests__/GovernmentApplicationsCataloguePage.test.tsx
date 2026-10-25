import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GovernmentApplicationsCataloguePage } from '../GovernmentApplicationsCataloguePage';

// Mock react-router-dom's useNavigate
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

// Mock the ingestion service
jest.mock('../../services/ingestion/ingestionService', () => ({
  getGovernmentServices: jest.fn().mockResolvedValue([
    {
      id: 'svc1',
      serviceName: 'Test Service',
      department: 'Test Department',
      category: 'test',
      jurisdiction: 'Testland',
      officialUrl: '',
      applicationTypes: [
        {
          id: 'v-pub',
          variantCode: 'V-PUB',
          lifecycleStatus: 'published',
          applicationName: 'Published Service',
          requirements: [],
          applicantCategory: 'individual',
        },
        {
          id: 'v-needs',
          variantCode: 'V-NEEDS',
          lifecycleStatus: 'needs_verification',
          applicationName: 'Needs Verification Service',
          requirements: [],
          applicantCategory: 'individual',
        },
        {
          id: 'v-extract',
          variantCode: 'V-EXTRACT',
          lifecycleStatus: 'extracted',
          applicationName: 'Extracted Service',
          requirements: [],
          applicantCategory: 'individual',
        },
        {
          id: 'v-discovered',
          variantCode: 'V-DISCOVERED',
          lifecycleStatus: 'discovered',
          applicationName: 'Discovered Service',
          requirements: [],
          applicantCategory: 'individual',
        },
        {
          id: 'v-superseded',
          variantCode: 'V-SUPER',
          lifecycleStatus: 'superseded',
          applicationName: 'Superseded Service',
          requirements: [],
          applicantCategory: 'individual',
        },
        {
          id: 'v-unknown',
          variantCode: 'V-UNKNOWN',
          lifecycleStatus: 'unknown_status',
          applicationName: 'Unknown Service',
          requirements: [],
          applicantCategory: 'individual',
        },
      ],
    },
  ]),
}));

const explanations: Record<string, string> = {
  published: 'Service is fully published and ready for validation.',
  needs_verification: 'Service needs verification before validation can occur.',
  extracted: "Service's source documents have been extracted but not yet verified.",
  discovered: 'Service has been discovered but not yet processed.',
  superseded: 'Service has been superseded by a newer version.',
};

const defaultMsg = 'Service is not currently available for validation.';

describe('GovernmentApplicationsCataloguePage lifecycle status tooltips', () => {
  test('renders correct human‑readable tooltip for each status', async () => {
    render(<GovernmentApplicationsCataloguePage />);

    // Wait for the cards to load
    await waitFor(() => expect(screen.getAllByText(/Validation Unavailable/).length).toBeGreaterThan(0));

    const statuses = [
      'needs_verification',
      'extracted',
      'discovered',
      'superseded',
      'unknown_status',
    ];

    statuses.forEach((status) => {
      const button = screen.getByRole('button', { name: new RegExp(`Validation Unavailable (${status})`) });
      const expectedTitle = explanations[status] ?? defaultMsg;
      expect(button).toHaveAttribute('title', expectedTitle);
    });

    // Published variant should not have a disabled button with tooltip
    const publishButton = screen.queryByRole('button', { name: /Validation Unavailable \(published\)/i });
    expect(publishButton).toBeNull();
  });
});
