import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { createRoutesStub } from "react-router";
import { setupStore } from "test-utils";
import { SuggestedTask } from "#/components/features/home/tasks/task.types";
import OpenHands from "#/api/open-hands";
import { TaskCard } from "#/components/features/home/tasks/task-card";
import { GitRepository } from "#/types/git";

const MOCK_TASK_1: SuggestedTask = {
  issue_number: 123,
  repo: "repo1",
  title: "Task 1",
  task_type: "MERGE_CONFLICTS",
  git_provider: "github",
};

const MOCK_RESPOSITORIES: GitRepository[] = [
  { id: "1", full_name: "repo1", git_provider: "github", is_public: true },
  { id: "2", full_name: "repo2", git_provider: "github", is_public: true },
  { id: "3", full_name: "repo3", git_provider: "gitlab", is_public: true },
  { id: "4", full_name: "repo4", git_provider: "gitlab", is_public: true },
];

const renderTaskCard = (task = MOCK_TASK_1) => {
  const RouterStub = createRoutesStub([
    {
      Component: () => <TaskCard task={task} />,
      path: "/",
    },
    {
      Component: () => <div data-testid="conversation-screen" />,
      path: "/conversations/:conversationId",
    },
  ]);

  return render(<RouterStub />, {
    wrapper: ({ children }) => (
      <Provider store={setupStore()}>
        <QueryClientProvider client={new QueryClient()}>
          {children}
        </QueryClientProvider>
      </Provider>
    ),
  });
};

describe("TaskCard", () => {
  it("format the issue id", async () => {
    renderTaskCard();

    const taskId = screen.getByTestId("task-id");
    expect(taskId).toHaveTextContent(/#123/i);
  });

  it("should call createConversation when clicking the launch button", async () => {
    const createConversationSpy = vi.spyOn(OpenHands, "createConversation");

    renderTaskCard();

    const launchButton = screen.getByTestId("task-launch-button");
    await userEvent.click(launchButton);

    expect(createConversationSpy).toHaveBeenCalled();
  });

  describe("creating suggested task conversation", () => {
    beforeEach(() => {
      const retrieveUserGitRepositoriesSpy = vi.spyOn(
        OpenHands,
        "retrieveUserGitRepositories",
      );
      retrieveUserGitRepositoriesSpy.mockResolvedValue(MOCK_RESPOSITORIES);
    });

    it("should call create conversation with suggest task trigger and selected suggested task", async () => {
      const createConversationSpy = vi.spyOn(OpenHands, "createConversation");

      renderTaskCard(MOCK_TASK_1);

      const launchButton = screen.getByTestId("task-launch-button");
      await userEvent.click(launchButton);

      expect(createConversationSpy).toHaveBeenCalledWith(
        MOCK_RESPOSITORIES[0].full_name,
        MOCK_RESPOSITORIES[0].git_provider,
        undefined,
        {
          git_provider: "github",
          issue_number: 123,
          repo: "repo1",
          task_type: "MERGE_CONFLICTS",
          title: "Task 1",
        },
        undefined,
        undefined,
        undefined,
      );
    });
  });

  it("should disable the launch button and update text content when creating a conversation", async () => {
    renderTaskCard();

    const launchButton = screen.getByTestId("task-launch-button");
    await userEvent.click(launchButton);

    expect(launchButton).toHaveTextContent(/Loading/i);
    expect(launchButton).toBeDisabled();
  });

  it("should navigate to the conversation page after creating a conversation", async () => {
    const createConversationSpy = vi.spyOn(OpenHands, "createConversation");
    createConversationSpy.mockResolvedValue({
      conversation_id: "test-conversation-id",
      title: "Test Conversation",
      selected_repository: "repo1",
      selected_branch: "main",
      git_provider: "github",
      last_updated_at: "2023-01-01T00:00:00Z",
      created_at: "2023-01-01T00:00:00Z",
      status: "RUNNING",
      runtime_status: "STATUS$READY",
      url: null,
      session_api_key: null
    });

    renderTaskCard();

    const launchButton = screen.getByTestId("task-launch-button");
    await userEvent.click(launchButton);

    // Wait for navigation to the conversation page
    await screen.findByTestId("conversation-screen");
  });
});
