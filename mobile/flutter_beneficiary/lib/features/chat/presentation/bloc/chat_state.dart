import 'package:equatable/equatable.dart';

class ChatMessage extends Equatable {
  final int id;
  final String text;
  final bool isFromUser;

  const ChatMessage({
    required this.id,
    required this.text,
    required this.isFromUser,
  });

  @override
  List<Object?> get props => [id, text, isFromUser];
}

class ChatState extends Equatable {
  final List<ChatMessage> messages;
  final bool isSending;

  const ChatState({this.messages = const [], this.isSending = false});

  ChatState copyWith({List<ChatMessage>? messages, bool? isSending}) {
    return ChatState(
      messages: messages ?? this.messages,
      isSending: isSending ?? this.isSending,
    );
  }

  @override
  List<Object?> get props => [messages, isSending];
}
