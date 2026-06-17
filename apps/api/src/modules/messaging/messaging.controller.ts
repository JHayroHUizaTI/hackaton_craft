import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  assignConversationSchema,
  conversationsQuerySchema,
  createNoteSchema,
  reactMessageSchema,
  sendMessageSchema,
  setAiModeSchema,
  setStatusSchema,
  MessageAuthor,
  type AssignConversationInput,
  type AccessTokenClaims,
  type CreateNoteInput,
  type ReactMessageInput,
  type SendMessageInput,
  type SetAiModeInput,
  type SetStatusInput,
} from "@crm/shared";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { MessagingService } from "./messaging.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Get("conversations")
  listConversations(
    @CurrentUser() user: AccessTokenClaims,
    @Query("filter") filter?: string,
    @Query("status") status?: string,
  ) {
    const q = conversationsQuerySchema.parse({ filter, status });
    return this.messaging.listConversations(user.sub, q, user.role);
  }

  @Get("conversations/:id/messages")
  getMessages(@Param("id") id: string) {
    return this.messaging.getMessages(id);
  }

  @Post("messages")
  send(@Body(new ZodValidationPipe(sendMessageSchema)) body: SendMessageInput) {
    return this.messaging.queueOutbound(body, MessageAuthor.HUMAN);
  }

  @Post("messages/react")
  react(
    @Body(new ZodValidationPipe(reactMessageSchema)) body: ReactMessageInput,
  ) {
    return this.messaging.reactToMessage(body.messageId, body.emoji);
  }

  @Patch("conversations/:id/assign")
  assign(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(assignConversationSchema))
    body: AssignConversationInput,
  ) {
    return this.messaging.assignConversation(id, body.agentId);
  }

  @Patch("conversations/:id/status")
  setStatus(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(setStatusSchema)) body: SetStatusInput,
  ) {
    return this.messaging.setStatus(id, body.status);
  }

  @Patch("conversations/:id/ai-mode")
  setAiMode(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(setAiModeSchema)) body: SetAiModeInput,
  ) {
    return this.messaging.setAiMode(id, body.mode);
  }

  @Get("conversations/:id/notes")
  listNotes(@Param("id") id: string) {
    return this.messaging.listNotes(id);
  }

  @Post("conversations/:id/notes")
  addNote(
    @Param("id") id: string,
    @CurrentUser() user: AccessTokenClaims,
    @Body(new ZodValidationPipe(createNoteSchema)) body: CreateNoteInput,
  ) {
    return this.messaging.addNote(id, user.sub, body.body);
  }
}
