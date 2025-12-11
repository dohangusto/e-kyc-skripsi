import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';

import 'chat_event.dart';
import 'chat_state.dart';

class ChatBloc extends Bloc<ChatEvent, ChatState> {
  ChatBloc() : super(const ChatState()) {
    on<ChatStarted>(_onStarted);
    on<ChatMessageSent>(_onMessageSent);
  }

  FutureOr<void> _onStarted(ChatStarted event, Emitter<ChatState> emit) {
    emit(
      state.copyWith(
        messages: const [
          ChatMessage(
            id: 1,
            text:
                'Halo, ada yang bisa kami bantu? Pesan kamu akan dijawab oleh petugas.',
            isFromUser: false,
          ),
        ],
      ),
    );
  }

  FutureOr<void> _onMessageSent(
    ChatMessageSent event,
    Emitter<ChatState> emit,
  ) async {
    final newUserMessage = ChatMessage(
      id: state.messages.length + 1,
      text: event.message,
      isFromUser: true,
    );
    final updatedMessages = [...state.messages, newUserMessage];
    emit(state.copyWith(messages: updatedMessages, isSending: true));

    await Future<void>.delayed(const Duration(milliseconds: 700));

    final reply = ChatMessage(
      id: updatedMessages.length + 1,
      text: 'Pesan kamu sudah kami terima. Balasan mungkin tidak langsung.',
      isFromUser: false,
    );
    emit(
      state.copyWith(messages: [...updatedMessages, reply], isSending: false),
    );
  }
}
